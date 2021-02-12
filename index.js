const puppeteer = require('puppeteer');
const fs = require('fs');

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to obtain the values and text of selectable weather stations on https://acis.alberta.ca/acis/weather-data-viewer.jsp from the acis_stations drop down
async function getStations(){
    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    const url = 'https://acis.alberta.ca/acis/weather-data-viewer.jsp';

    await page.goto(url);

    // make sure that the map is fully populated before selecting a weather station, otherwise weather station will not be selected by drop down
    await page.waitForSelector('#map > div > div > div:nth-child(1) > div:nth-child(3) > div > div:nth-child(4) > div:nth-child(1)');

    const results = await page.evaluate(()=>{
        // defining selector
        const STATION =  "#acis_stations > option";

        // array to store data
        const data = [];

        const stationRows = document.querySelectorAll(STATION);

        // looping over each date row
        for (const op of stationRows){
            data.push({
                stationID: op.getAttribute("value"),
                stationName: op.innerText,
                stationLatitude: "",
                stationLongitude: "",
                stationElevation: "",
                stationClimateID: "",
                stationWMOID: "",
                stationTransportCanID: ""
            });
        }

        return data;     
    })

    console.log(JSON.stringify(results,null,2));

    const fs = require('fs');

    // write to json file the results
    fs.writeFile(
        './stations.json',
        JSON.stringify(results,null,2),
        (err) => err ? console.error('Data not written!',err):console.log('Data written!')
    );

    browser.close();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to obtain the weather stations co-ordinates and elevation for further showing on maps
// TODO: While reading the GPS and ID information, it is also possible to read what elements are reported by the station.
// this could be used to programmatically obtain the correct station data besides temp and precip only.
// TODO: Cleanup poorly designed code, especially the nested trycatches
async function getStationGPS(){

    const fs  = require('fs');

    // Read the stations JSON file in order to obtain the station id and name
    let stations;
    fs.readFile('./stations.json', 'utf8', (err, jsonString)=> {
        if(err){
            console.log("Error reading from file:", err)
            return
        }
        try{
            stations = JSON.parse(jsonString)
            console.log("Station is:", stations[1].stationID)
        } catch(err){
            console.log('Error parsing JSON:', err)
        }
    })

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser. newPage();

    const url = 'https://acis.alberta.ca/acis/weather-data-viewer.jsp';

    // opens the url 
    await page.goto(url);

    // make sure that the map is fully populated before selecting a weather station, otherwise weather station will not be selected by drop down
    await page.waitForSelector('#map > div > div > div:nth-child(1) > div:nth-child(3) > div > div:nth-child(4) > div:nth-child(1)');

    // loop through all of the weather stations in order to get their meta-data
    for (let index = 380; index < 400; index++) {
    //for (let index = 1; index < stations.length; index++) {
        let station = stations[index];

        // select from the drop down the weather station
        await page.select("#acis_stations",station.stationID);
        // click the get station meta-data selection
        await page.click('#selectedStationList > div > img:nth-child(3)');

        await page.waitForSelector("#meta_stn");
        await page.waitFor(650);
        // Goes through the loaded table and obtains the required coordinate values and station IDs
        // TODO: See about shortening and clenaing up this code to not use data -> station -> stations
        const result = await page.evaluate(()=>{
            const data = []
            data.push({
                stationLatitude: document.querySelector("#meta_lat").innerText,
                stationLongitude: document.querySelector("#meta_lon").innerText,
                stationElevation: document.querySelector("#meta_elv").innerText,
                stationClimateID: document.querySelector("#meta_alias_ecid").innerText,
                stationWMOID: document.querySelector("#meta_alias_wmo").innerText,
                stationTransportCanID: document.querySelector("#meta_alias_tc").innerText
            })
            return data;
        })
        // obtain station coordinate information and IDs
        station.stationLatitude = result[0].stationLatitude;
        station.stationLongitude = result[0].stationLongitude;
        station.stationElevation = result[0].stationElevation;
        station.stationClimateID = result[0].stationClimateID;
        station.stationWMOID = result[0].stationWMOID;
        station.stationTransportCanID = result[0].stationTransportCanID;
        
        stations[index] = station;

        // TODO: Look into a cleaner form of waiting to close the table and then removing the selected station
        try {
            // close the opened meta-data table
            await page.waitForFunction('document.querySelector("#fancybox-close")');
            await page.click("#fancybox-close");
        } catch (error) {
            try {
                // close the opened meta-data table
                await page.waitFor(650);

                await page.waitForFunction('document.querySelector("#fancybox-close")');
                await page.click("#fancybox-close");
                const abc ="abc"
            } catch (error) {
                try {
                    await page.waitFor(650);

                    await page.waitForFunction('document.querySelector("#fancybox-close")');
                    await page.click("#fancybox-close");
                } catch (error) {
                    console.log("closing: ",error);
                }
            }
        }

        try {
            //await delay(400);

            await page.waitFor(610);
            // remove current station from selected list
            await page.click("#selectedStationList > div > img.station-list-report-button.removeStationButton");
        } catch (error) {
            try {
                await page.waitFor(610);
                // remove current station from selected list
                await page.click("#selectedStationList > div > img.station-list-report-button.removeStationButton");
                const abc ="abc"
            } catch (error) {
                try {
                    await page.waitFor(610);
                    // remove current station from selected list
                    await page.click("#selectedStationList > div > img.station-list-report-button.removeStationButton");
                const abc ="abc"
                } catch (error) {
                    console.log("removing: ",error);
                }
            }
        }

        
        
        
    }

    // write to json file the results
    fs.writeFile(
        './stations.json',
        JSON.stringify(stations,null,2),
        (err) => err ? console.error('Data not written!',err):console.log('Data written!')
    );

    browser.close();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to obtain weather station weather data for the weather stations on https://acis.alberta.ca/acis/weather-data-viewer.jsp
// TODO: have function accept weather station IDs in order to obtain data for the requested station
async function getWeather(){
    const browser = await puppeteer.launch({
        // headless: false,
        // defaultViewport: null
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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to read JSON file
function jsonReader(filePath, cb){
    fs.readFile(filePath, (err, fileData) => {
        if(err){
            return cb && cb(err)
        }
        try{
            const object = JSON.parse(fileData);
            return cb && cb(null, object)
        } catch(err) {
            return cb && cb(err)
        }
    });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to delay next command
function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }


//getWeather();
//getStations();
getStationGPS();