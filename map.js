// // Import Mapbox as an ESM module
// import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// // Your Mapbox token
// import { MAPBOX_TOKEN } from './token.js';
// mapboxgl.accessToken = MAPBOX_TOKEN;

// // Create the map
// const map = new mapboxgl.Map({
//   container: 'map',
//   style: 'mapbox://styles/mapbox/streets-v12',
//   center: [-71.09415, 42.36027],
//   zoom: 12,
//   minZoom: 5,
//   maxZoom: 18,
// });

// function getCoords(station) {
//   const point = new mapboxgl.LngLat(+station.lon, +station.lat);
//   const { x, y } = map.project(point);
//   return { cx: x, cy: y };
// }

// // Reusable bike lane style
// const bikeLaneStyle = {
//   'line-color': '#32D400',
//   'line-width': 4,
//   'line-opacity': 0.6,
// };

// // Wait until map fully loads
// map.on('load', async () => {
//   // =========================
//   // Boston bike lanes
//   // =========================
//   map.addSource('boston_route', {
//     type: 'geojson',
//     data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
//   });

//   map.addLayer({
//     id: 'boston-bike-lanes',
//     type: 'line',
//     source: 'boston_route',
//     paint: bikeLaneStyle,
//   });

//   // =========================
//   // Cambridge bike lanes
//   // =========================
//   map.addSource('cambridge_route', {
//     type: 'geojson',
//     data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
//   });

//   map.addLayer({
//     id: 'cambridge-bike-lane',
//     type: 'line',
//     source: 'cambridge_route',
//     paint: bikeLaneStyle,
//   });

//   console.log('Bike lanes loaded!');
// });

// // =========================
// // Load Bluebikes station data
// // =========================
// try {
//   const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
//   const jsonData = await d3.json(jsonurl);
//   console.log('Loaded JSON Data:', jsonData);

//   let stations = jsonData.data.stations;

//   const trips = await d3.csv(
//     'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'
//   );
//   console.log('Trips:', trips);

//   // 1. FIRST: Calculate arrivals, departures, and totalTraffic
//   const departures = d3.rollup(
//     trips,
//     (v) => v.length,
//     (d) => d.start_station_id
//   );

//   const arrivals = d3.rollup(
//     trips,
//     (v) => v.length,
//     (d) => d.end_station_id
//   );

//   stations = stations.map((station) => {
//     const id = station.short_name;
//     station.arrivals = arrivals.get(id) ?? 0;
//     station.departures = departures.get(id) ?? 0;
//     station.totalTraffic = station.arrivals + station.departures;
//     return station;
//   });

//   console.log('Stations with traffic:', stations);

//   // 2. SECOND: Define your scale now that totalTraffic is calculated
//   const radiusScale = d3
//     .scaleSqrt()
//     .domain([0, d3.max(stations, (d) => d.totalTraffic)])
//     .range([0, 25]);

//   // 3. Ensure an SVG container exists over the map
//   let svg = d3.select('#map').select('svg');
//   if (svg.empty()) {
//     svg = d3.select('#map').append('svg')
//       .style('position', 'absolute')
//       .style('z-index', 1)
//       .style('width', '100%')
//       .style('height', '100%')
//       .style('pointer-events', 'none'); // Allows map dragging
//   }

//   // 4. THIRD: Draw the circles 
//   const circles = svg
//     .selectAll('circle')
//     .data(stations)
//     .enter()
//     .append('circle')
//     .attr('cx', (d) => getCoords(d).cx)
//     .attr('cy', (d) => getCoords(d).cy)
//     .attr('r', (d) => radiusScale(d.totalTraffic))
//     .attr('fill', 'steelblue')
//     .attr('fill-opacity', 0.6)
//     .attr('stroke', 'white')
//     .attr('stroke-width', 1)
//     .style('pointer-events', 'auto') // Re-enable pointer events for the tooltips
//     .each(function (d) {
//       d3.select(this)
//         .append('title')
//         .text(
//           `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
//         );
//     });

//   // Update positions function
//   function updatePositions() {
//     circles
//       .attr('cx', (d) => getCoords(d).cx)
//       .attr('cy', (d) => getCoords(d).cy);
//   }

//   // Initial positioning
//   updatePositions();

//   // Keep circles synced with map
//   map.on('move', updatePositions);
//   map.on('zoom', updatePositions);
//   map.on('resize', updatePositions);
//   map.on('moveend', updatePositions);

// } catch (error) {
//   console.error('Error loading JSON:', error);
// }

import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { MAPBOX_TOKEN } from './token.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

// Create the map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

// =========================
// Global Variables & Data Buckets
// =========================
let stations = [];
let trips = [];
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);
let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

// =========================
// UI Selection & Helpers
// =========================
const timeSlider = document.getElementById('time-slider'); // Removed the '#' typo
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// =========================
// Step 5.4 Optimized Filtering Logic
// =========================
function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) {
    return tripsByMinute.flat(); // No filtering, return all trips
  }

  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    let beforeMidnight = tripsByMinute.slice(minMinute);
    let afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

function computeStationTraffic(stationsData, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stationsData.map((station) => {
    // Clone to avoid mutating the original dataset
    let cloned = { ...station }; 
    let id = cloned.short_name;
    cloned.arrivals = arrivals.get(id) ?? 0;
    cloned.departures = departures.get(id) ?? 0;
    cloned.totalTraffic = cloned.arrivals + cloned.departures;
    return cloned;
  });
}

// =========================
// Map Load & Initialization
// =========================
map.on('load', async () => {
    // Reusable bike lane style 
  const bikeLaneStyle = {
    'line-color': '#32D400',
    'line-width': 2,
    'line-opacity': 0.7,
  };

  // =========================
  // Boston bike lanes
  // =========================
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: bikeLaneStyle,
  });

  // =========================
  // Cambridge bike lanes
  // =========================
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  map.addLayer({
    id: 'cambridge-bike-lane',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLaneStyle,
  });

  console.log('Bike lanes loaded!');

  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    stations = jsonData.data.stations;

    // Load CSV and populate minute buckets immediately
    trips = await d3.csv(
      'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
      (trip) => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);

        let startedMinutes = minutesSinceMidnight(trip.started_at);
        departuresByMinute[startedMinutes].push(trip);

        let endedMinutes = minutesSinceMidnight(trip.ended_at);
        arrivalsByMinute[endedMinutes].push(trip);

        return trip;
      }
    );

    // Initial station traffic calculation (all trips)
    const initialStations = computeStationTraffic(stations);

    // Dynamic radius scale based on maximum traffic
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(initialStations, (d) => d.totalTraffic)])
      .range([0, 25]);

    // Ensure SVG exists
    let svg = d3.select('#map').select('svg');
    if (svg.empty()) {
      svg = d3.select('#map').append('svg')
        .style('position', 'absolute')
        .style('z-index', 1)
        .style('width', '100%')
        .style('height', '100%')
        .style('pointer-events', 'none');
    }

    // Initial Circle Rendering (Note the key function: (d) => d.short_name)
    let circles = svg
      .selectAll('circle')
      .data(initialStations, (d) => d.short_name)
      .enter()
      .append('circle')
      .attr('cx', (d) => getCoords(d).cx)
      .attr('cy', (d) => getCoords(d).cy)
      .attr('r', (d) => radiusScale(d.totalTraffic))
  
      .attr('fill-opacity', 0.6)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .style('pointer-events', 'auto')
      // Step 6.1: Add the CSS variable for color mapping (with division-by-zero protection)
      .style('--departure-ratio', (d) =>
        stationFlow(d.totalTraffic === 0 ? 0.5 : d.departures / d.totalTraffic)
      );

    // Function to keep circles synced with map movements
    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).cx)
        .attr('cy', (d) => getCoords(d).cy);
    }

    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

    // =========================
    // Reactivity: Updating the Scatterplot
    // =========================
    function updateScatterPlot(timeFilter) {
      const filteredStations = computeStationTraffic(stations, timeFilter);
      
      timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

      // 2. Re-select 'circle' from the svg and assign the result BACK to our 'circles' variable
      circles = svg.selectAll('circle')
        .data(filteredStations, (d) => d.short_name)
        .join('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic))
        .style('--departure-ratio', (d) =>
          stationFlow(d.totalTraffic === 0 ? 0.5 : d.departures / d.totalTraffic)
        );
    }

    function updateTimeDisplay() {
      let timeFilter = Number(timeSlider.value);

      if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
      } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
      }

      updateScatterPlot(timeFilter);
    }

    // Bind event listener to the slider
    timeSlider.addEventListener('input', updateTimeDisplay);
    
    // Call once to initialize UI
    updateTimeDisplay();

  } catch (error) {
    console.error('Error loading data:', error);
  }
});