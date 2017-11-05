const redis = require('redis')
const Promise = require('bluebird')
Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

const bittrexApi = require('node.bittrex.api')
const uuid = require('uuid/v1')
const http = require('http')

const redisClient = redis.createClient()

redisClient.on('error', function (err) {
    console.log('Error ' + err)
})

function addCurrencyRecord (currency, tradingTick) {
    const tickId = uuid()
    const createDate = new Date().getTime()

    redisClient.hmset('data:' + currency + ':' + tickId, {
        bid: tradingTick.Bid,
        ask: tradingTick.Ask,
        last: tradingTick.Last
    }, (err, obj) => {
        if (err) {
            console.log('Error adding currency record. Data:', obj, currency, tradingTick)
        }
    })

    redisClient.zadd(['timeData', createDate, tickId], (err, obj) => {
        if (err) {
            console.log('Error adding filtering set of currency record. Data:', obj, createDate, currency, tradingTick)
        }
    })
}

const currency = 'BTC'
setInterval(_ => {
    bittrexApi.getticker({ market: 'USDT-' + currency }, (data, err) => {
        if (data.success) {
            addCurrencyRecord(currency, data.result)
        } else {
            console.log('getticker request failed. Error:', err, data)
        }
    })
}, 1000)

// to make heroku work
http.createServer((request, response) => {
    console.log('request starting for ');
    console.log(request);
}).listen(process.env.PORT || 5000)
