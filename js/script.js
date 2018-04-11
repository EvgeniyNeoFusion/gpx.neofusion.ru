let currentMap;
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

    setCenter(center) {
        this.myMap.setCenter(center);
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
        let gpxData = gpxParser.parse(xml);
        currentMap.render(gpxData);
    };
    if (file) fr.readAsText(file);
}

function onClearMap() {
    currentMap.clear();
}

function onCenterMap() {
    currentMap.setCenter(towns[selectedTown.value]);
}

window.onload = function () {
    currentMap = new YandexMap('map', towns['Moscow'], 14);

    if (window.File && window.FileReader && window.FileList && window.Blob) {
        document.getElementById('loadFile').addEventListener('change', onFileSelect, false);
    } else {
        alert('К сожалению, ваш браузер не поддерживает file API');
    }

    selectedTown = document.getElementById('town');

    document.getElementById('clearMap').addEventListener('click', onClearMap, false);
    document.getElementById('centerMap').addEventListener('click', onCenterMap, false);
};
