const defaultZoom = 14;
let yandexMap;
let osmMap;
let gpxData;
let selectedTown;

const towns = {
    'Moscow': [55.753676, 37.619899]
};

class YandexMap {
    constructor(mapId, center, zoom) {
        this.myMap = null;
        this.myGeoObjects = null;
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
        });
    }

    render(list) {
        let that = this;
        let firstTrack = true;
        this.clear();
        this.myGeoObjects = new ymaps.GeoObjectCollection({}, {strokeWidth: 4});
        list.forEach(function (coords) {
            if (firstTrack) {
                that.setCenter(coords[0]);
                firstTrack = false;
            }
            that.myGeoObjects.add(new ymaps.Polyline(coords));
        });
        this.myMap.geoObjects.add(this.myGeoObjects);
    }

    clear() {
        this.myMap.geoObjects.remove(this.myGeoObjects);
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

    render(list) {
        let that = this;
        let firstTrack = true;
        this.clear();
        list.forEach(function (coords) {
            if (firstTrack) {
                that.setCenter(coords[0]);
                firstTrack = false;
            }
            that.layerGroup.addLayer(L.polyline(coords, {color: 'blue'}));
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
    let file = e.target.files[0];
    let fr = new FileReader();
    fr.onload = function (event) {
        let content = event.target.result.toString();
        let parser = new DOMParser();
        let xml = parser.parseFromString(content, 'text/xml');
        let gpxParser = new GpxParser();
        gpxData = gpxParser.parse(xml);
        render(gpxData);
    };
    if (file) fr.readAsText(file);
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
        document.getElementById('loadFile').addEventListener('change', onFileSelect, false);
    } else {
        alert('К сожалению, ваш браузер не поддерживает file API');
    }

    selectedTown = document.getElementById('town');

    document.getElementById('clearMap').addEventListener('click', onClearMap, false);
    document.getElementById('centerMap').addEventListener('click', onCenterMap, false);
};
