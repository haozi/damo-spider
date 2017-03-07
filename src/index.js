import Crawler from 'crawler'
import _path from 'path'
import _url from 'url'
import ora from 'ora'
import childProcess from 'child_process'

class Spider {
  constructor ({startUrl}) {
    this.OUTPUT = `${__dirname}/../download`
    this.startUrl = startUrl
    this.downloadList = []
  }

  async run () {
    const list = await this.getList(this.startUrl)
    for (let url of list.list) {
      var { url: zipUrl, title } = await this.getZip(url)
      console.log(zipUrl)
      this.downloadList.push(zipUrl)
      const spinner = ora(`downloading ${zipUrl}`).start()
      this.download(zipUrl, title)
      await this.sleep(0.5)
      spinner.succeed(`《${title}》`)
    }
  }

  crawl (url) {
    return new Promise((resolve, reject) => {
      const c = new Crawler({
        rateLimit: 2000,
        maxConnections: 1,
        callback (error, res, done) {
          if (error) {
            console.log(error)
            reject(error)
          } else {
            resolve(res)
          }
          done()
        }
      })
      c.queue(url)
    })
  }

  sleep (delay) {
    return new Promise(resolve => {
      setTimeout(resolve, delay * 1000)
    })
  }

  getRelativePath (bUrl, href = '') {
    let rUrl = ''
    const { protocol, host } = _url.parse(bUrl)
    if (href[0] === '/') {
      rUrl = `${protocol}//${host}${href}`
    } else if (/^http/.test(href)) {
      rUrl = href
    } else {
      rUrl = _path.dirname(bUrl) + '/' + href
    }
    return rUrl
  }

  async getList (url) {
    const slector = '.WebStyle3 > table a'
    const res = await this.crawl(url)
    let list = Array.from(res.$(slector))

    list = list.map(item => {
      return this.getRelativePath(url, res.$(item).attr('href'))
    })
    let next = list.pop()
    return {
      list,
      next
    }
  }

  async getZip (url) {
    const res = await this.crawl(url)
    const href = res.$('a[href$=".zip"]').attr('href')
    return {
      title: res.$('title').text(),
      url: this.getRelativePath(url, href)
    }
  }

  async download (url, title) {
    await this.runBash(`
      mkdir -p ${this.OUTPUT} &&
      cd ${this.OUTPUT} &&
      curl -o "${title}.zip" ${url}
    `)
  }

  runBash (bash, options = {}) {
    return new Promise((resolve, reject) => {
      // logger.log(`\` ${bash} \``)
      const p = childProcess.exec(bash, options, (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
      // p.stderr.pipe(process.stderr)
      p.stdout.pipe(process.stdout)
    })
  }
}

new Spider({
  startUrl: 'http://www.108js.com/search.jsp?keyword=canvas&maxresults=1398&startat=0'
}).run()
