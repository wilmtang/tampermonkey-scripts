// ==UserScript==
// @name         Peakbagger GPX Analyzer
// @namespace    https://github.com/wilmtang/tampermonkey-scripts
// @version      13.9
// @description  Interactive linear elevation chart by distance and time with persistent settings.
// @author       wilmtang
// @license      MIT
// @homepageURL  https://github.com/wilmtang/tampermonkey-scripts/tree/main/Peakbagger
// @supportURL   https://github.com/wilmtang/tampermonkey-scripts/issues
// @updateURL    https://update.greasyfork.org/scripts/580091/Peakbagger%20GPX%20Analyzer.meta.js
// @downloadURL  https://update.greasyfork.org/scripts/580091/Peakbagger%20GPX%20Analyzer.user.js
// @match        https://www.peakbagger.com/climber/ascent.aspx*
// @match        https://www.peakbagger.com/climber/Ascent.aspx*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js
// @grant        none
// ==/UserScript==

(async () => {
    'use strict';



    const initChart = async () => {
        // 1. Locate GPX link and build UI
        const gpxLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Download this GPS track'));
        if (!gpxLink) return;

        const container = document.createElement('div');
        Object.assign(container.style, { marginTop: '15px', padding: '10px', border: '1px solid #ccc', background: '#fafafa', borderRadius: '5px', maxWidth: '800px' });

        const headerBox = document.createElement('div');
        Object.assign(headerBox.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' });

        const statsContainer = document.createElement('div');
        const stats = document.createElement('div');
        Object.assign(stats.style, { fontFamily: 'sans-serif', fontWeight: 'bold' });
        stats.innerText = "Analyzing GPX data...";

        const subStats = document.createElement('div');
        Object.assign(subStats.style, { fontFamily: 'sans-serif', fontSize: '0.9em', color: '#444', marginTop: '4px', fontStyle: 'italic' });

        statsContainer.append(stats, subStats);

        const controlsContainer = document.createElement('div');
        Object.assign(controlsContainer.style, { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' });

        const unitSelect = document.createElement('select');
        Object.assign(unitSelect.style, { padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', outline: 'none' });
        unitSelect.innerHTML = '<option value="imp">Imperial</option><option value="met">Metric</option>';

        const hintText = document.createElement('div');
        Object.assign(hintText.style, { fontSize: '0.8em', color: '#888', marginTop: '4px', fontStyle: 'italic' });
        hintText.innerText = "Double-click point to copy coordinates";

        controlsContainer.append(unitSelect, hintText);
        headerBox.append(statsContainer, controlsContainer);

        const canvasContainer = document.createElement('div');
        Object.assign(canvasContainer.style, { position: 'relative', height: '300px', width: '100%' });

        const canvas = document.createElement('canvas');
        canvasContainer.append(canvas);
        container.append(headerBox, canvasContainer);
        gpxLink.after(container);

        canvas.addEventListener('dblclick', (e) => {
            if (!chartInstance) return;
            const activeElements = chartInstance.getElementsAtEventForMode(e, chartInstance.options.interaction.mode, chartInstance.options.interaction, true);
            if (activeElements.length > 0) {
                const datasetIndex = activeElements[0].datasetIndex;
                const idx = activeElements[0].index;
                const d = chartInstance.data.datasets[datasetIndex].data[idx]._raw;
                if (d && d.lat !== undefined && d.lon !== undefined) {
                    const text = `${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}`;
                    navigator.clipboard.writeText(text).then(() => {
                        hintText.innerHTML = `<span style="color: #2e8b57; font-weight: bold;">✓ Copied: ${text}</span>`;
                        setTimeout(() => { hintText.innerText = "Double-click point to copy coordinates"; }, 2500);
                    }).catch(err => console.error('Failed to copy', err));
                }
            }
        });

        // 2. Mathematical & Formatting Helpers
        const toRad = x => x * Math.PI / 180;
        const calcDistMiles = (l1, n1, l2, n2) => {
            const a = Math.sin(toRad(l2 - l1) / 2) ** 2 + Math.cos(toRad(l1)) * Math.cos(toRad(l2)) * Math.sin(toRad(n2 - n1) / 2) ** 2;
            return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };
        const fmtTime = ms => ms > 0 ? `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m` : '0m';
        const getRelativeDay = (ms, startMs) => {
            const startDate = new Date(startMs);
            const currDate = new Date(ms);
            const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const currMidnight = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
            const diffMs = currMidnight - startMidnight;
            return Math.round(diffMs / 86400000) + 1;
        };
        const formatTimeStr = (ms, startMs, isMultiDay) => {
            const timeStr = new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (isMultiDay) {
                return `Day ${getRelativeDay(ms, startMs)} ${timeStr}`;
            }
            return timeStr;
        };

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
        let startMs = 0, endMs = 0, summitMs = 0, maxEle = -Infinity;
        let campingSpots = [];
        let hoverMarker = null;

        // 4. Chart & UI Renderer Engine
        const renderData = () => {
            const isMet = unitSelect.value === 'met';
            const dMult = isMet ? 1.60934 : 1, eMult = isMet ? 0.3048 : 1;
            const dUnit = isMet ? 'km' : 'miles', eUnit = isMet ? 'm' : 'ft';

            const isMultiDay = hasTime && (getRelativeDay(endMs, startMs) > 1);

            // Format Stats Bar
            let txt = `Interactive Stats: ${(totalDistMiles * dMult).toFixed(2)} ${dUnit} | ${(gainFeet * eMult).toFixed(0)} ${eUnit} gain`;
            if (hasTime) {
                txt += ` | Time: ${fmtTime(totalMs)}`;
                if (summitMs > startMs) {
                    const timeToSummit = summitMs - startMs;
                    const timeBack = endMs - summitMs;
                    let campingHtml = "";
                    if (campingSpots.length > 0) {
                        const spotStrs = campingSpots.map(s => `Day ${s.day} (${s.lat.toFixed(5)}, ${s.lon.toFixed(5)})`).join(' | ');
                        campingHtml = `<div style="color: #888; font-size: 0.95em; margin-top: 2px;">Possible Camping: ${spotStrs}</div>`;
                    }
                    subStats.innerHTML = `
                    <div style="color: #666; margin-bottom: 2px;">Start time: ${formatTimeStr(startMs, startMs, isMultiDay)} | Summit time: ${formatTimeStr(summitMs, startMs, isMultiDay)} | Back to car: ${formatTimeStr(endMs, startMs, isMultiDay)}</div>
                    <div style="color: #888; font-size: 0.95em;">Time to summit: ${fmtTime(timeToSummit)} | Time back: ${fmtTime(timeBack)}</div>
                    ${campingHtml}
                `;
                } else {
                    subStats.innerHTML = "";
                }
            } else {
                subStats.innerHTML = "";
            }
            stats.innerHTML = `<span style="color:#000000;">${txt}</span>`;

            // Map Raw Arrays
            const eleDistData = [], eleTimeData = [];
            rawData.forEach(d => {
                const eleConv = parseFloat((d.ele * eMult).toFixed(0));
                eleDistData.push({ x: parseFloat((d.dist * dMult).toFixed(2)), y: eleConv, _raw: d });
                if (hasTime && d.ms) {
                    eleTimeData.push({ x: d.ms, y: eleConv, _raw: d });
                }
            });

            if (chartInstance) chartInstance.destroy();

            const datasets = [{
                label: `Elevation by Distance`,
                data: eleDistData,
                borderColor: '#fc4c02',
                backgroundColor: 'rgba(252, 76, 2, 0.15)',
                borderWidth: 2, fill: true, tension: 0.2, yAxisID: 'y', xAxisID: 'x', pointRadius: 0, pointHoverRadius: 5, hitRadius: 40
            }];

            if (hasTime) {
                datasets.push({
                    label: `Elevation by Time`,
                    data: eleTimeData,
                    borderColor: '#6ab0de',
                    backgroundColor: 'rgba(0, 127, 182, 0.15)',
                    borderWidth: 2, fill: true, tension: 0.2, yAxisID: 'y', xAxisID: 'xTime', pointRadius: 0, pointHoverRadius: 5, hitRadius: 40
                });
            }

            const maxDist = parseFloat((totalDistMiles * dMult).toFixed(2));

            chartInstance = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: { datasets },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'nearest', intersect: true, axis: 'xy' },
                    onHover: (event, activeElements) => {
                        const mapIframe = document.querySelector('iframe[src*="MasterMap.aspx"], iframe[src*="mastermap.aspx"]');
                        const iframeWin = mapIframe ? mapIframe.contentWindow : null;

                        if (activeElements.length > 0 && iframeWin && iframeWin.mapsPlaceholder && iframeWin.L) {
                            const datasetIndex = activeElements[0].datasetIndex;
                            const idx = activeElements[0].index;
                            const dataArray = datasetIndex === 0 ? eleDistData : eleTimeData;
                            const d = dataArray[idx] ? dataArray[idx]._raw : null;
                            const isRed = datasetIndex === 0;
                            const fillColor = isRed ? '#FF0000' : '#0055FF';

                            if (d && d.lat !== undefined && d.lon !== undefined) {
                                const L = iframeWin.L;
                                const map = iframeWin.mapsPlaceholder;

                                // Recreate marker if it doesn't match the current map instance (e.g. iframe reloaded)
                                if (hoverMarker) {
                                    try {
                                        if (hoverMarker._map !== map) {
                                            hoverMarker = null;
                                        }
                                    } catch (e) {
                                        hoverMarker = null;
                                    }
                                }

                                if (!hoverMarker) {
                                    hoverMarker = L.circleMarker([d.lat, d.lon], {
                                        radius: 9,
                                        color: '#FFFFFF',
                                        fillColor: fillColor,
                                        fillOpacity: 1,
                                        opacity: 1,
                                        weight: 2
                                    }).addTo(map);
                                } else {
                                    hoverMarker.setLatLng([d.lat, d.lon]);
                                    hoverMarker.setStyle({ color: '#FFFFFF', fillColor: fillColor, opacity: 1, fillOpacity: 1 });
                                }
                            }
                        } else {
                            if (hoverMarker) {
                                hoverMarker.setStyle({ opacity: 0, fillOpacity: 0 });
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: { usePointStyle: true, boxWidth: 8 },
                            onClick: function (e, legendItem, legend) {
                                const index = legendItem.datasetIndex;
                                const chart = legend.chart;

                                chart.setDatasetVisibility(index, !chart.isDatasetVisible(index));

                                let visibleCount = 0;
                                chart.data.datasets.forEach((dataset, i) => {
                                    if (chart.isDatasetVisible(i)) visibleCount++;
                                });

                                if (visibleCount === 1) {
                                    chart.options.interaction = { mode: 'index', intersect: false };
                                } else {
                                    chart.options.interaction = { mode: 'nearest', intersect: true, axis: 'xy' };
                                }
                                chart.update('none');
                            }
                        },
                        tooltip: {
                            filter: (tooltipItem, index) => index === 0,
                            callbacks: {
                                title: items => {
                                    const d = items[0].raw._raw;
                                    return `Dist: ${(d.dist * dMult).toFixed(2)} ${dUnit}`;
                                },
                                label: item => {
                                    const d = item.raw._raw;
                                    let lbl = `${item.dataset.label}: ${item.parsed.y} ${eUnit}`;
                                    if (d.grade !== undefined) lbl += ` (Grade: ${d.grade.toFixed(1)}%)`;
                                    return lbl;
                                },
                                afterBody: items => {
                                    const d = items[0].raw._raw;
                                    if (hasTime && d.ms) {
                                        return [`Time: ${formatTimeStr(d.ms, startMs, isMultiDay)}`];
                                    }
                                    return [];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            min: 0,
                            max: maxDist > 0 ? maxDist : 1,
                            title: { display: true, text: `Distance (${dUnit})` },
                            ticks: { maxTicksLimit: 10, callback: function (v) { return parseFloat(v).toFixed(1) + ` ${dUnit}`; } }
                        },
                        ...(hasTime && {
                            xTime: {
                                type: 'linear',
                                position: 'top',
                                min: startMs,
                                max: endMs > startMs ? endMs : startMs + 1000,
                                title: { display: true, text: 'Time', color: '#007fb6' },
                                ticks: {
                                    maxTicksLimit: 10,
                                    color: '#007fb6',
                                    callback: function (v) {
                                        return formatTimeStr(v, startMs, isMultiDay);
                                    }
                                },
                                grid: { drawOnChartArea: false }
                            }
                        }),
                        y: {
                            type: 'linear', position: 'left',
                            title: { display: true, text: `Elevation (${eUnit})`, color: '#000000' }
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

            if (hasTime) {
                trkpts.sort((a, b) => {
                    const timeA = a.querySelector('time') ? new Date(a.querySelector('time').textContent).getTime() : 0;
                    const timeB = b.querySelector('time') ? new Date(b.querySelector('time').textContent).getTime() : 0;
                    return timeA - timeB;
                });
            }

            let prev = null;
            let validPrevDistPt = null;
            let eleLocalMin = null;
            let recentPts = [];
            const DIST_THRESHOLD_MILES = 5 / 1609.34; // 5 meters
            const ELE_THRESHOLD_FEET = 3 * 3.28084;   // 3 meters

            trkpts.forEach((pt, i) => {
                const lat = parseFloat(pt.getAttribute('lat')), lon = parseFloat(pt.getAttribute('lon'));
                const ele = pt.querySelector('ele') ? parseFloat(pt.querySelector('ele').textContent) * 3.28084 : 0;
                const ms = pt.querySelector('time') ? new Date(pt.querySelector('time').textContent).getTime() : 0;
                let grade = 0;

                if (i === 0 && hasTime) startMs = ms;
                if (hasTime) endMs = ms;

                if (ele > maxEle) {
                    maxEle = ele;
                    summitMs = ms;
                }

                if (i === 0) {
                    eleLocalMin = ele;
                    validPrevDistPt = { lat, lon, ele };
                }

                if (prev) {
                    if (hasTime && prev.day) {
                        const currDay = getRelativeDay(ms, startMs);
                        if (currDay > prev.day) {
                            campingSpots.push({ day: prev.day, lat: prev.lat, lon: prev.lon });
                        }
                    }

                    // 1. Distance Threshold
                    const dFromValid = calcDistMiles(validPrevDistPt.lat, validPrevDistPt.lon, lat, lon);
                    if (dFromValid >= DIST_THRESHOLD_MILES) {
                        totalDistMiles += dFromValid;
                        validPrevDistPt = { lat, lon, ele };
                    }

                    // 2. Elevation Hysteresis
                    if (ele < eleLocalMin) {
                        eleLocalMin = ele;
                    } else if (ele - eleLocalMin >= ELE_THRESHOLD_FEET) {
                        gainFeet += (ele - eleLocalMin);
                        eleLocalMin = ele;
                    }

                    // 3. Grade Moving Baseline
                    recentPts.push({ dist: totalDistMiles, ele: ele });
                    if (recentPts.length > 5) recentPts.shift();

                    if (recentPts.length > 1) {
                        const oldestPt = recentPts[0];
                        const distDiff = totalDistMiles - oldestPt.dist;
                        if (distDiff > 0) {
                            grade = ((ele - oldestPt.ele) / (distDiff * 5280)) * 100;
                        }
                    }
                } else {
                    recentPts.push({ dist: 0, ele: ele });
                }

                if (i % 3 === 0 || i === trkpts.length - 1) {
                    rawData.push({
                        dist: totalDistMiles, ele: ele, grade: grade, ms: ms, lat: lat, lon: lon,
                        time: hasTime ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
                    });
                }
                prev = { lat, lon, ele, ms, day: hasTime ? getRelativeDay(ms, startMs) : 1 };
            });

            if (hasTime) {
                totalMs = endMs - startMs;
            }

            renderData();

        } catch (e) {
            stats.innerText = "Error parsing GPX file.";
            console.error(e);
        }
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initChart);
    } else {
        initChart();
    }
})();
