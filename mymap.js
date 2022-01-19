var keleti = [19.08336, 47.50095] //KELETI
var blaha = [19.070488, 47.496325] //BLAHA LUJZA
var view = new ol.View({
    center: ol.proj.fromLonLat([keleti]),
    zoom: 16
})

var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: view
});

const geolocation = new ol.Geolocation({
    // enableHighAccuracy must be set to true to have the heading value.
    trackingOptions: {
        enableHighAccuracy: true,
    },
    projection: view.getProjection(),
});

geolocation.on('change', function () {
    el('accuracy').innerText = geolocation.getAccuracy().toFixed(1) + ' [m]';
    var eh = ol.proj.toLonLat(geolocation.getPosition());
    el('coordinates').innerText = eh[1].toFixed(6) + ', ' + eh[0].toFixed(6);
    /*el('altitude').innerText = geolocation.getAltitude() + ' [m]';
    el('altitudeAccuracy').innerText = geolocation.getAltitudeAccuracy() + ' [m]';
    el('heading').innerText = geolocation.getHeading() + ' [rad]';
    el('speed').innerText = geolocation.getSpeed() + ' [m/s]';*/
});

const accuracyFeature = new ol.Feature();
geolocation.on('change:accuracyGeometry', function () {
    accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

const positionFeature = new ol.Feature();
positionFeature.setStyle(
    new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#3399CC',
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 2,
            }),
        }),
    })
);

geolocation.on('change:position', function () {
    const coordinates = geolocation.getPosition();
    positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
    view.setCenter(coordinates);
    checkForPOIs();
    //console.log('position changed');
});

var styleBefore = new ol.style.Style({
    image: new ol.style.Circle({
        radius: 6,
        /*fill: new ol.style.Fill({
            color: '#CC9933',
        }),*/
        stroke: new ol.style.Stroke({
            color: '#a00',
            width: 3,
        }),
    }),
    stroke: new ol.style.Stroke({
        color: '#a00',
        width: 4,
    }),
    fill: new ol.style.Fill({
        color: 'rgba(255, 0, 0, 0.1)',
    }),
});

var styleCurrent = new ol.style.Style({
    image: new ol.style.Circle({
        radius: 9,
        /*fill: new ol.style.Fill({
            color: '#CC9933',
        }),*/
        stroke: new ol.style.Stroke({
            color: '#f92',
            width: 4,
        }),
    }),
    stroke: new ol.style.Stroke({
        color: '#f92',
        width: 4,
    }),
    fill: new ol.style.Fill({
        color: 'rgba(255, 0, 0, 0.1)',
    }),
});



const iconStyle = new ol.style.Style({
    image: new ol.style.Icon({
        anchor: [0.5, 1],
        src: 'pin.png',
        scale: 0.3,
    }),
});

const nextPOIfeature = new ol.Feature({
    geometry: new ol.geom.Point([0, 0]),
    name: 'next goal',
});

nextPOIfeature.setStyle(iconStyle);




var features = [];

function coordsToFeatures() {
    //console.log('coords to features ', coords);
    for (let i = 0; i < coords.length; i++) {
        features.push(fromGoogleToFeature(coords[i]));
    }
    POILayer.getSource().addFeatures(features);
}

var POILayer = new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: features,
    }),
});

var currentLayer = new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: [positionFeature],
    }),
});

var nextPOILayer = new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: [nextPOIfeature],
    }),
});

function checkForPOIs() {
    //console.log('checkforPOIS');
    var iWasAtPOI = iAmAtPOI.valueOf();
    iAmAtPOI = -1;
    var pois = POILayer.getSource().getFeatures();
    el('distances').innerText = '';
    var coordOfPosition = positionFeature.getGeometry().getCoordinates();
    for (let i = 0; i < pois.length; i++) {
        var iAmHere = false;
        if (pois[i].getGeometry().getType() == ('Point')) {
            var distance = getDistance(coordOfPosition, pois[i].getGeometry());
            //var coord1 = pois[i].getGeometry().getCoordinates();
            //var distance = Math.sqrt(Math.pow(coord1[0] - coordOfPosition[0], 2) + Math.pow(coord1[1] - coordOfPosition[1], 2));
            el('distances').innerText += '\n' + thecsv[i].title + ' ' + distance.toFixed(2);
            if (distance < 5) {
                iAmHere = true;
            }
        } else if (pois[i].getGeometry().getType() == ('Polygon')) {
            iAmHere = pois[i].getGeometry().intersectsCoordinate(coordOfPosition);
            var distance = getDistance(coordOfPosition, pois[i].getGeometry());
            el('distances').innerText += '\n' + thecsv[i].title + ' ' + distance.toFixed(2);
        }
        if (iAmHere) {
            pois[i].setStyle(styleCurrent);
            iAmAtPOI = i;
        } else {
            pois[i].setStyle(styleBefore);
        }
    }
    if (iWasAtPOI != iAmAtPOI) {
        console.log('POI was:', iWasAtPOI, 'POI now:', iAmAtPOI);
        if (iWasAtPOI > iAmAtPOI) {
            setNextLocation(iWasAtPOI);
        }
        stateChanged();
        nextPOIfeature.getGeometry().setCoordinates(
            ol.extent.getCenter(POILayer.getSource().getFeatures()[nextPOI].getGeometry().getExtent())
        )
    }
}

var poli;

function fromGoogleToFeature(coord) {
    if (coord.length > 2) {
        /////////////////////////////
        //console.log('1ccords ', coord);
        var coordArray = []
        while (coord.length) coordArray.push(coord.splice(0, 2));
        coordArray.push(coordArray[0]);
        //console.log('2ccords ', coordArray);
        /////////////////////////////
        var coordinates = coordArray.map(p => {
            return ol.proj.fromLonLat([p[1], p[0]]);
        });
        //console.log('3ccords ', coordinates);
        poli = new ol.geom.Polygon([coordinates]);
        var feature = new ol.Feature({
            geometry: poli,
            //name: 'Lofasz',
        });
    } else if (coord.length == 2) {
        var coordinates = ol.proj.fromLonLat([coord[1], coord[0]]);
        var point = new ol.geom.Point(coordinates);
        var feature = new ol.Feature({
            geometry: point
        });
        //feature.setGeometry(point);
    }
    feature.setStyle(styleBefore);
    return feature;
}

function getDistance(point, geom) {
    var coord1 = []
    if (geom.getType() == 'Point') {
        coord1 = geom.getCoordinates();

    } else if (geom.getType() == 'Polygon') {
        coord1 = geom.getClosestPoint(point);
    }
    return Math.sqrt(
        Math.pow(coord1[0] - point[0], 2) +
        Math.pow(coord1[1] - point[1], 2));
}

/*var test = [
    [47.496679, 19.069235],
    [47.497033, 19.070401],
    [47.496257, 19.070583],
    [47.496330, 19.069296],
    [47.496679, 19.069235],
];

// Test if a coordinate is inside a polygon
//poli.intersectsCoordinate(geolocation.getPosition())

const styles = [
    // We are using two different styles for the polygons:
    //  - The first style is for the polygons themselves.
    //  - The second style is to draw the vertices of the polygons.
    //    In a custom `geometry` function the vertices of a polygon are
    //    returned as `MultiPoint` geometry, which will be used to render
    //    the style.
    //
    new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'blue',
            width: 3,
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 0.1)',
        }),
    }),
    new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
                color: 'orange',
            }),
        }),
        geometry: function (feature) {
            // return the coordinates of the first ring of the polygon
            const coordinates = feature.getGeometry().getCoordinates()[0];
            return new ol.geom.MultiPoint(coordinates);
        },
    }),
];

var TESTLayer = new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: [fromGoogleToPolygon(test)]
    }),
    style: styleBefore,
});*/