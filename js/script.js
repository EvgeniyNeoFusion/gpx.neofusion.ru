ymaps.ready(init);
var myMap;
var myGeoObjects;
var selectedTown;
var isFirstTrack;

var towns = {
    'Moscow': [ 55.753676, 37.619899 ]
};

function processTrksegNode(trksegNode) {
    if (trksegNode.hasChildNodes()) {
        var coords = [];
        for (var i in trksegNode.childNodes) {
            if (trksegNode.childNodes.hasOwnProperty(i)) {
                var node = trksegNode.childNodes[i];
                if (node.nodeType == Node.ELEMENT_NODE && node.nodeName == 'trkpt') {
                    var lat = node.attributes.lat.value;
                    var lon = node.attributes.lon.value;
                    coords.push([lat, lon]);
                    if (isFirstTrack) {
                        myMap.setCenter([lat, lon]);
                        isFirstTrack = false;
                    }
                }
            }
        }
        if (coords.length > 0) {
            myGeoObjects.add(new ymaps.Polyline(coords));
        }
    }
}

function processTrkNode(trkNode) {
    if (trkNode.hasChildNodes()) {
        for (var i in trkNode.childNodes) {
            if (trkNode.childNodes.hasOwnProperty(i)) {
                var node = trkNode.childNodes[i];
                if (node.nodeType == Node.ELEMENT_NODE && node.nodeName == 'trkseg') {
                    processTrksegNode(node);
                }
            }
        }
    }
}

function processGpxNode(gpxNode) {
    if (gpxNode.hasChildNodes()) {
        for (var i in gpxNode.childNodes) {
            if (gpxNode.childNodes.hasOwnProperty(i)) {
                var node = gpxNode.childNodes[i];
                if (node.nodeType == Node.ELEMENT_NODE && node.nodeName == 'trk') {
                    processTrkNode(node);
                }
            }
        }
    }
}

function onFileSelect(e) {
    onClearMap();
    var file = e.target.files[0];
    var fr = new FileReader();
    fr.onload = function(event) {
        var content = event.target.result.toString();
        var parser = new DOMParser();
        var xml = parser.parseFromString(content, 'text/xml');
        if (xml.documentElement.nodeName == 'gpx') {
            isFirstTrack = true;
            myGeoObjects = new ymaps.GeoObjectCollection({}, { strokeWidth: 4 });
            processGpxNode(xml.documentElement);
            myMap.geoObjects.add(myGeoObjects);
        } else {
            alert('Ошибка разбора XML');
        }
    };
    fr.readAsText(file);
}

function onClearMap() {
    myMap.geoObjects.remove(myGeoObjects);
}

function onCenterMap() {
    myMap.setCenter(towns[selectedTown.value]);
}

function init() {
    myMap = new ymaps.Map('map', {
        center: towns['Moscow'],
        zoom: 14,
        controls: [ 'zoomControl', 'typeSelector' ]
    });

    if(window.File && window.FileReader && window.FileList && window.Blob) {
        document.getElementById('loadFile').addEventListener('change', onFileSelect, false);
    } else {
        alert('К сожалению, ваш браузер не поддерживает file API');
    }

    selectedTown = document.getElementById('town');

    document.getElementById('clearMap').addEventListener('click', onClearMap, false);
    document.getElementById('centerMap').addEventListener('click', onCenterMap, false);
}
