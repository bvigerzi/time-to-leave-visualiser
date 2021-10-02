const express = require('express')
const fs = require('fs')

const data = fs.readFileSync('time_to_leave.ttldb', 'utf-8')
const parsedData = JSON.parse(data)
parsedData.sort((e1, e2) => {
    return Date.parse(e1.date) - Date.parse(e2.date)
})

const dateComparator = (date1, date2) => {
    return Date.parse(date2) - Date.parse(date1)
}

const search = (sortedData, item, comparator) => {
    let searchIndex = -1
    let lowerBound = 0
    let upperBound = sortedData.length - 1
    while(upperBound > lowerBound) {
        searchIndex = parseInt((upperBound + lowerBound) / 2)
        const comp = comparator(sortedData[searchIndex], item)
        if (comp === 0) {
            return searchIndex
        }
        else if(comp < 0) {
            upperBound = searchIndex -1
        } else {
            lowerBound = searchIndex + 1
        }
    }
    return upperBound < 0 ? 0 : upperBound
}

const slice = (req, data) => {
    const startDate = req.query["start"] ? req.query["start"] : null
    const endDate = req.query["end"] ? req.query["end"] : null
    const startDateIndex = startDate === null ? 0 : search(data.map(value => value.date), startDate, dateComparator)
    const endDateIndex = endDate === null ? data.length - 1 : search(data.map(value => value.date), endDate, dateComparator)
    return data.slice(startDateIndex, endDateIndex + 1)
}

const diffHourPair = (startHour, endHour) => {
    const startHourMin = startHour.split(":").map(item => parseInt(item))
    const endHourMin = endHour.split(":").map(item => parseInt(item))
    let hours = endHourMin[0] - startHourMin[0]
    let mins = endHourMin[1] - startHourMin[1]
    if(mins < 0) {
        hours = hours - 1
        mins = mins + 60
    }
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const addHourPair = (firstHour, secondHour) => {
    const firstHourMin = firstHour.split(":").map(item => parseInt(item))
    const secondHourMin = secondHour.split(":").map(item => parseInt(item))
    let hours = firstHourMin[0] + secondHourMin[0]
    let mins = firstHourMin[1] + secondHourMin[1]
    if(mins >= 60) {
        hours = hours + 1
        mins = mins % 60
    }
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const hoursInDay = (hoursToday) => {
    if(typeof hoursToday === "string") {
        return hoursToday
    }
    if (hoursToday.length % 2 !== 0) {
        throw Error("Invalid hour pairs, missing end time")
    }

    let totalHours = []
    for(i = 0; i < hoursToday.length - 1; i = i + 2) {
        totalHours.push(diffHourPair(hoursToday[i], hoursToday[i+1]))
    } // TODO: map then reduce
    const reducedHours = totalHours.reduce((prevValue, currentValue) => {
        return addHourPair(prevValue, currentValue)
    })
    return reducedHours
}

const app = express()

app.get('/sum', function (req, res) {
    const slicedData = slice(req, parsedData)
    const hours = slicedData.map(item => {
        if(item.type === "waived") {
            return item.hours
        } else {
            return item.values
        }
    })
    res.send(hours.reduce((prevValue, currValue) => {
        return addHourPair(prevValue, hoursInDay(currValue))
    }, "00:00"))
})

app.get('/', function (req, res) {
    res.json(slice(req, parsedData))
})

app.listen(3000)
