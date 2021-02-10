const puppeteer = require('puppeteer');

// Function to obtain weather station weather data for the weather stations on https://acis.alberta.ca/acis/weather-data-viewer.jsp
async function getWeather(){
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage();

    const url = 'https://acis.alberta.ca/acis/weather-data-viewer.jsp';

    // make ckeckbox selections in order to obtain the accumulated precipitation, current precip, and air temp
    await page.goto(url);
    await page.click("#cb_pop_pr_b", {clickCount:1});
    await page.click('#cb_pop_pr_a', {clickCount:1});
    await page.click('#cb_pop_at_ave',{clickCount:1});
    await page.select('#periodSelection',"HOURLY");

    // make sure that the map is fully populated before selecting a weather station, otherwise weather station will not be selected by drop down
    await page.waitForSelector('#map > div > div > div:nth-child(1) > div:nth-child(3) > div > div:nth-child(4) > div:nth-child(1)');

    // selects the Akimina 2 weather station from drop down
    await page.select('#acis_stations',"11799");

    await page.click('button[title="View selected weather data in a tabular format"]');

    // wait for weather table to populate
    await page.waitForSelector('#acisDataTable');

    const tableDetails = await page.evaluate(()=>{
        const grabFromRow = (row, classname) => row
            .querySelector(`td:nth-child(${classname})`) // grab the td
            .innerText                                   // grab the text
            .trim();                                      // remove spaces

        // defining selector
        const DATE_ROW_SELECTOR = '#acisDataTable > tbody > tr';

        // array to store data
        const data =[];

        const dateRows = document.querySelectorAll(DATE_ROW_SELECTOR);

        // looping over each date row
        for (const tr of dateRows){
            // Verify that the data being displayed does not contain unavailable data
            if (grabFromRow(tr,'4') != "UNAVAILBLE") {
                data.push({
                    station: grabFromRow(tr,'1'),
                    dateTime: grabFromRow(tr,'2'),
                    AirTemp: grabFromRow(tr,'3'),
                    precipAccum: grabFromRow(tr,'6'),
                    precip: grabFromRow(tr,'9')
                });
            }
        }

        return data;

    })

    console.log(tableDetails);

    browser.close();
}

getWeather();