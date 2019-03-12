const defaultZoom = 14;
let yandexMap;
let osmMap;
let gpxData = [];
let selectedTown;
let fileInput;

const towns = {
    'Moscow': [55.753676, 37.619899]
};
const colors = [
    '#0066ff',
    '#28b900',
    '#ff003b',
    '#c200ff',
    '#00c3ff',
    '#ff6c00',
    '#ff009a',
];

function getGenerator(arrayOfValues) {
    let i = 0;
    return {
        next: function () {
            let value = arrayOfValues[i];
            if (i < arrayOfValues.length - 1) {
                i++;
            } else {
                i = 0;
            }
            return value;
        }
    }
}

class YandexMap {
    constructor(mapId, center, zoom) {
        this.myMap = null;
        this.init(mapId, center, zoom);
    }

    init(mapId, center, zoom) {
        let that = this;
        ymaps.ready(function () {
            that.myMap = new ymaps.Map(mapId, {
                center: center,
                zoom: zoom,
                controls: ['zoomControl', 'typeSelector']
            });
            let typeSelector = that.myMap.controls.get('typeSelector');
            typeSelector.options.set('panoramasItemMode', 'off');
        });
    }

    render(tracks) {
        this.clear();
        let that = this;
        let color = getGenerator(colors);
        tracks.forEach(function (track, index) {
            that.renderTrack(track, color.next(), index === 0);
        });
    }

    renderTrack(segments, color, first) {
        let that = this;
        let myGeoObjects = new ymaps.GeoObjectCollection({}, {strokeWidth: 4, strokeColor: color});
        segments.forEach(function (points, index) {
            if (first && index === 0) {
                that.setCenter(points[0]);
            }
            myGeoObjects.add(new ymaps.Polyline(points));
        });
        this.myMap.geoObjects.add(myGeoObjects);
    }

    clear() {
        this.myMap.geoObjects.removeAll();
    }

    getCenter() {
        return this.myMap.getCenter();
    }

    setCenter(center) {
        this.myMap.setCenter(center);
    }

    getZoom() {
        return this.myMap.getZoom();
    }

    setZoom(zoom) {
        this.myMap.setZoom(zoom);
    }

    setView(center, zoom) {
        this.myMap.setCenter(center, zoom);
    }
}

class LeafletMap {
    constructor(mapId, center, zoom) {
        this.myMap = null;
        this.layerGroup = null;
        this.init(mapId, center, zoom);
    }

    init(mapId, center, zoom) {
        this.myMap = L.map(mapId).setView(center, zoom);
        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        }).addTo(this.myMap);
        this.layerGroup = L.layerGroup().addTo(this.myMap);
    }

    render(tracks) {
        this.clear();
        let that = this;
        let color = getGenerator(colors);
        tracks.forEach(function (track, index) {
            that.renderTrack(track, color.next(), index === 0);
        });
    }

    renderTrack(segments, color, first) {
        let that = this;
        segments.forEach(function (points, index) {
            if (first && index === 0) {
                that.setCenter(points[0]);
            }
            that.layerGroup.addLayer(L.polyline(points, {color: color}));
        });
    }

    clear() {
        this.layerGroup.clearLayers();
    }

    getCenter() {
        let center = this.myMap.getCenter();
        return [center.lat, center.lng];
    }

    setCenter(center) {
        this.myMap.panTo(center, {animate: false});
    }

    getZoom() {
        return this.myMap.getZoom();
    }

    setZoom(zoom) {
        this.myMap.setZoom(zoom, {animate: false});
    }

    setView(center, zoom) {
        this.myMap.setView(center, zoom, {animate: false});
    }
}

class GpxParser {
    constructor() {
        this.geoList = [];
    }

    processTrksegNode(trksegNode) {
        if (trksegNode.hasChildNodes()) {
            let coords = [];
            for (let i in trksegNode.childNodes) {
                if (trksegNode.childNodes.hasOwnProperty(i)) {
                    let node = trksegNode.childNodes[i];
                    if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'trkpt') {
                        let lat = node.attributes.lat.value;
                        let lon = node.attributes.lon.value;
                        coords.push([lat, lon]);
                    }
                }
            }
            if (coords.length > 0) {
                this.geoList.push(coords);
            }
        }
    }

    processTrkNode(trkNode) {
        if (trkNode.hasChildNodes()) {
            for (let i in trkNode.childNodes) {
                if (trkNode.childNodes.hasOwnProperty(i)) {
                    let node = trkNode.childNodes[i];
                    if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'trkseg') {
                        this.processTrksegNode(node);
                    }
                }
            }
        }
    }

    processGpxNode(gpxNode) {
        if (gpxNode.hasChildNodes()) {
            for (let i in gpxNode.childNodes) {
                if (gpxNode.childNodes.hasOwnProperty(i)) {
                    let node = gpxNode.childNodes[i];
                    if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'trk') {
                        this.processTrkNode(node);
                    }
                }
            }
        }
    }

    parse(xml) {
        if (xml.documentElement.nodeName === 'gpx') {
            this.processGpxNode(xml.documentElement);
            return this.geoList;
        } else {
            alert('Ошибка разбора XML');
        }
    }
}

function onFileSelect(e) {
    let files = Array.prototype.slice.call(e.target.files);
    Promise.all(files.map(function (file) {
        return new Promise(function (resolve) {
            let fr = new FileReader();
            fr.onload = function (event) {
                let content = event.target.result.toString();
                let parser = new DOMParser();
                let xml = parser.parseFromString(content, 'text/xml');
                let gpxParser = new GpxParser();
                resolve(gpxParser.parse(xml));
            };
            fr.readAsText(file);
        });
    })).then(function (results) {
        gpxData = results;
        render(results);
    });
}

function render(data) {
    [yandexMap, osmMap].forEach(function (map) {
        if (map) {
            map.render(data);
            map.setZoom(defaultZoom);
        }
    });
}

function onClearMap() {
    fileInput.value = '';
    [yandexMap, osmMap].forEach(function (map) {
        if (map) map.clear();
    });
}

function onCenterMap() {
    [yandexMap, osmMap].forEach(function (map) {
        if (map) map.setView(towns[selectedTown.value], defaultZoom);
    });
}

window.onload = function () {
    fileInput = document.getElementById('loadFile');
    fileInput.value = '';

    yandexMap = new YandexMap('yandexMap', towns['Moscow'], defaultZoom);

    let mapRadios = document.querySelectorAll('input[type=radio][name="map"]');
    Array.prototype.forEach.call(mapRadios, function (item) {
        item.addEventListener('change', function () {
            switch(this.value) {
                case 'yandex':
                    document.getElementById('osmMap').classList.add('hidden');
                    document.getElementById('yandexMap').classList.remove('hidden');
                    yandexMap.setView(osmMap.getCenter(), osmMap.getZoom());
                    break;
                case 'osm':
                    document.getElementById('yandexMap').classList.add('hidden');
                    document.getElementById('osmMap').classList.remove('hidden');
                    if (osmMap === undefined) {
                        osmMap = new LeafletMap('osmMap', yandexMap.getCenter(), yandexMap.getZoom());
                        if (gpxData) {
                            osmMap.render(gpxData);
                            osmMap.setCenter(yandexMap.getCenter());
                        }
                    } else {
                        osmMap.setView(yandexMap.getCenter(), yandexMap.getZoom());
                    }
                    break;
                default:
                    break;
            }
        })
    });

    if (window.File && window.FileReader && window.FileList && window.Blob) {
        fileInput.addEventListener('change', onFileSelect, false);
    } else {
        alert('К сожалению, ваш браузер не поддерживает file API');
    }

    selectedTown = document.getElementById('town');

    document.getElementById('clearMap').addEventListener('click', onClearMap, false);
    document.getElementById('centerMap').addEventListener('click', onCenterMap, false);
};
