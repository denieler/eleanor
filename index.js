const redis = require('redis')
const Promise = require('bluebird')
Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

const bittrexApi = require('node.bittrex.api')
const uuid = require('uuid/v1')
const http = require('http')

const redisClient = redis.createClient({
    url: process.env.REDIS_URL
})

redisClient.on('error', function (err) {
    console.log('Error ' + err)
})

function addCurrencyRecord (currency, tradingTick) {
    const tickId = uuid()
    const createDate = new Date().getTime()

    if (!tradingTick || !tradingTick.length) {
        return
    }

    const tradingData = tradingTick[0]
    redisClient.hmset('data:' + currency + ':' + tickId, {
        high:      tradingData.High,
        low:       tradingData.Low,
        volume:    tradingData.Volume,
        last:      tradingData.Last,
        bid:       tradingData.Bid,
        ask:       tradingData.Ask,
        timeStamp: tradingData.TimeStamp,
        created:   tradingData.Created
    }, (err, obj) => {
        if (err) {
            console.log('Error adding currency record. Data:', obj, currency, tradingData)
        }
    })

    redisClient.zadd(['timeData', createDate, tickId], (err, obj) => {
        if (err) {
            console.log('Error adding filtering set of currency record. Data:', obj, createDate, currency, tradingData)
        }
    })
}

const currency = 'BTC'
setInterval(_ => {
    bittrexApi.getmarketsummary({ market: 'USDT-' + currency }, (data, err) => {
        if (data.success) {
            addCurrencyRecord(currency, data.result)
        } else {
            console.log('getticker request failed. Error:', err, data)
        }
    })
}, 1000)

// to make heroku work
http.createServer((request, response) => {
    response.writeHead(200, {'Content-type':'text/plan'})
    response.end()
}).listen(process.env.PORT || 5000)
