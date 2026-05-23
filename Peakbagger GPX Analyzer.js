// ==UserScript==
// @name         Peakbagger GPX Analyzer (Speed Heading)
// @namespace    http://tampermonkey.net/
// @version      11.0
// @description  Interactive linear elevation/pace chart with precise moving speed heading (mph/kph) and persistent settings.
// @author       You
// @match        https://www.peakbagger.com/climber/ascent.aspx*
// @require      https://cdn.jsdelivr.net/npm/chart.js
// @grant        none
// ==/UserScript==

(async () => {
    'use strict';

    // 1. Locate GPX link and build UI
    const gpxLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Download this GPS track'));
    if (!gpxLink) return;

    const container = document.createElement('div');
    Object.assign(container.style, { marginTop: '15px', padding: '10px', border: '1px solid #ccc', background: '#fafafa', borderRadius: '5px', maxWidth: '800px' });

    const headerBox = document.createElement('div');
    Object.assign(headerBox.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' });

    const stats = document.createElement('div');
    Object.assign(stats.style, { fontFamily: 'sans-serif', fontWeight: 'bold' });
    stats.innerText = "Analyzing GPX data...";

    const unitSelect = document.createElement('select');
    Object.assign(unitSelect.style, { padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', outline: 'none' });
    unitSelect.innerHTML = '<option value="imp">Imperial</option><option value="met">Metric</option>';

    headerBox.append(stats, unitSelect);

    const canvasContainer = document.createElement('div');
    Object.assign(canvasContainer.style, { position: 'relative', height: '250px', width: '100%' });

    const canvas = document.createElement('canvas');
    canvasContainer.append(canvas);
    container.append(headerBox, canvasContainer);
    gpxLink.after(container);

    // 2. Mathematical & Formatting Helpers
    const toRad = x => x * Math.PI / 180;
    const calcDistMiles = (l1, n1, l2, n2) => {
        const a = Math.sin(toRad(l2-l1)/2)**2 + Math.cos(toRad(l1))*Math.cos(toRad(l2))*Math.sin(toRad(n2-n1)/2)**2;
        return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };
    const fmtTime = ms => ms > 0 ? `${Math.floor(ms/3600000)}h ${Math.floor((ms%3600000)/60000)}m` : '0m';
    const fmtPace = val => isFinite(val) && val <= 120 ? `${Math.floor(val)}:${Math.round((val%1)*60).toString().padStart(2,'0')}` : '--:--';

    // 3. Persistent Settings Handling (Memory)
    const STORAGE_KEY = 'pb_gpx_unit_pref';
    const savedPref = localStorage.getItem(STORAGE_KEY);

    if (savedPref) {
        unitSelect.value = savedPref;
    } else {
        let isMetricDefault = false;
        const elevTd = Array.from(document.querySelectorAll('td')).find(td => td.textContent.trim() === 'Elevation:');
        if (elevTd && elevTd.nextElementSibling && /^[\d,.]+\s*m/.test(elevTd.nextElementSibling.textContent.trim())) {
            isMetricDefault = true;
        }
        unitSelect.value = isMetricDefault ? 'met' : 'imp';
    }

    // Processing Arrays & Core Metrics
    let chartInstance = null;
    let rawData = [];
    let totalDistMiles = 0, gainFeet = 0, totalMs = 0, hasTime = false;
    let moveMs = 0, moveDistMiles = 0;

    // 4. Chart & UI Renderer Engine
    const renderData = () => {
        const isMet = unitSelect.value === 'met';
        const dMult = isMet ? 1.60934 : 1, eMult = isMet ? 0.3048 : 1, pDiv = isMet ? 1.60934 : 1;
        const dUnit = isMet ? 'km' : 'miles', eUnit = isMet ? 'm' : 'ft', pUnit = isMet ? 'min/km' : 'min/mi';
        const speedUnit = isMet ? 'km/h' : 'mi/h';
        const paceCeiling = isMet ? 60 : 90;

        // Format Stats Bar - Using Speed (mi/h or km/h) for the text summary heading
        let txt = `Interactive Stats: ${(totalDistMiles * dMult).toFixed(2)} ${dUnit} | ${(gainFeet * eMult).toFixed(0)} ${eUnit} gain`;
        if (hasTime) {
            txt += ` | ${fmtTime(totalMs)}`;
            if (moveMs > 0 && moveDistMiles > 0) {
                const totalMovingHours = moveMs / 3600000;
                const speed = (moveDistMiles * dMult) / totalMovingHours;
                txt += ` | Speed ${speed.toFixed(1)} ${speedUnit}`;
            }
        }
        stats.innerHTML = `<span style="color:#000000;">${txt}</span>`;

        // Map Raw Arrays to the active unit (Internal graph units remain un-altered)
        const labels = [], eleData = [], paceData = [];
        rawData.forEach(d => {
            labels.push(parseFloat((d.dist * dMult).toFixed(2)));
            eleData.push((d.ele * eMult).toFixed(0));
            if (hasTime) paceData.push(d.pace ? Math.min(d.pace / pDiv, paceCeiling) : null);
        });

        if (chartInstance) chartInstance.destroy();

        const datasets = [{
            label: `Elevation (${eUnit})`, data: eleData, borderColor: '#fc4c02', backgroundColor: 'rgba(252, 76, 2, 0.15)',
            borderWidth: 2, fill: true, tension: 0.2, yAxisID: 'y', pointRadius: 0, pointHoverRadius: 5
        }];

        if (hasTime) datasets.push({
            label: `Pace (${pUnit})`, data: paceData, borderColor: '#007fb6', borderWidth: 1.5,
            fill: false, tension: 0.3, spanGaps: true, yAxisID: 'yPace', pointRadius: 0, pointHoverRadius: 5
        });

        chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'line', data: { labels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        filter: tooltipItem => tooltipItem.datasetIndex === 0,
                        callbacks: {
                            title: items => `Dist: ${items[0].parsed.x.toFixed(2)} ${dUnit}`,
                            label: item => `Elev: ${item.raw} ${eUnit} (Grade: ${rawData[item.dataIndex].grade.toFixed(1)}%)`,
                            afterBody: items => {
                                const d = rawData[items[0].dataIndex];
                                let lines = [];
                                if (hasTime) {
                                    const pStr = d.pace ? `${fmtPace(d.pace / pDiv)}/${isMet ? 'km' : 'mi'}` : `--:--/${isMet ? 'km' : 'mi'}`;
                                    lines.push(`Pace: ${pStr}`);
                                    if (d.time) lines.push(`Time: ${d.time}`);
                                }
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        ticks: { maxTicksLimit: 10, callback: function(v) { return v + ` ${dUnit}`; } }
                    },
                    y: {
                        type: 'linear', position: 'left',
                        title: { display: true, text: `Elevation (${eUnit})`, color: '#000000' }
                    },
                    yPace: {
                        type: 'linear', display: hasTime, position: 'right', reverse: true, min: 0, max: paceCeiling,
                        title: { display: true, text: `Pace (${pUnit})`, color: '#007fb6' }, grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    };

    unitSelect.addEventListener('change', () => {
        localStorage.setItem(STORAGE_KEY, unitSelect.value);
        renderData();
    });

    // 5. Native DOM XML Extraction Engine
    try {
        const xml = new DOMParser().parseFromString(await (await fetch(gpxLink.href)).text(), "text/xml");
        const trkpts = Array.from(xml.querySelectorAll('trkpt'));
        if (!trkpts.length) return stats.innerText = "No track points found.";

        hasTime = !!trkpts[0].querySelector('time');
        let prev = null;

        trkpts.forEach((pt, i) => {
            const lat = parseFloat(pt.getAttribute('lat')), lon = parseFloat(pt.getAttribute('lon'));
            const ele = pt.querySelector('ele') ? parseFloat(pt.querySelector('ele').textContent) * 3.28084 : 0;
            const ms = pt.querySelector('time') ? new Date(pt.querySelector('time').textContent).getTime() : 0;
            let pace = null, grade = 0;

            if (prev) {
                const d = calcDistMiles(prev.lat, prev.lon, lat, lon);
                totalDistMiles += d;
                if (ele > prev.ele) gainFeet += (ele - prev.ele);
                if (d > 0) grade = ((ele - prev.ele) / (d * 5280)) * 100;

                if (hasTime) {
                    const dMs = ms - prev.ms;
                    if (dMs > 0) {
                        const calculatedMph = d / (dMs / 3600000);
                        if (calculatedMph > 0.5) {
                            moveMs += dMs;
                            moveDistMiles += d;
                            pace = 60 / calculatedMph;
                        }
                    }
                }
            }

            if (i % 3 === 0 || i === trkpts.length - 1) {
                rawData.push({
                    dist: totalDistMiles, ele: ele, pace: pace, grade: grade,
                    time: hasTime ? new Date(ms).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null
                });
            }
            prev = { lat, lon, ele, ms };
        });

        if (hasTime) {
            totalMs = new Date(trkpts[trkpts.length-1].querySelector('time').textContent) - new Date(trkpts[0].querySelector('time').textContent);
        }

        renderData();

    } catch (e) {
        stats.innerText = "Error parsing GPX file.";
        console.error(e);
    }
})();