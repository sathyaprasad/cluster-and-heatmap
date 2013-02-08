# cluster-and-heatmap

Clustering and heatmap libraries for ArcGIS JS API mapping applications

[View it live] (http://maps.esri.com/SP_DEMOS/crimemapper/index.html)

## Usage:

These libraries can be used independently and here is a sample usage in your code:

#### For clustering:

1. Include the js file (minified or full version)
<script type="text/javascript" src="cluster.js"></script>

2. Initialize the cluster layer with options. Look at the constructor of the layer for all possible options.
	clusterLayer = new modules.ClusterLayer(null, {
		map: map, //esri map object	
		visible: !1, //default visibility
		intervals: 4, //number of equal interval cluster classes
		pixelsSquare: 128, 
		rgb: [26, 26, 26], //color of the cluster graphic
		textrgb: [255, 255, 255] //color of label
	});

3. Add points to cluster where points are an array of objects which has x and y. Example: var points = [{x:12,y:22}]
	clusterLayer.setData(points);

4. Show the layer
	clusterLayer.show()

5. Connect to events such as onclick
	5a. on click do something
	
		dojo.connect(clusterLayer.graphics, "onClick", function(evt) {
			//get map extent that cluster respresents
			var query = new esri.tasks.Query();
			query.geometry = evt.graphic.attributes.extent;
			query.outSpatialReference = map.spatialReference;	

			//if you have a feature layer (feature service layer is optional)
			var f = myfeaturelayer.selectFeatures(query, esri.layers.FeatureLayer.SELECTION_NEW);

			//open popup to show info
			map.infoWindow.setFeatures([f]);
			map.infoWindow.show(evt.mapPoint);
		});


	5b. Draw graphic on mouse over on the cluster 
		var b = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_NULL, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASH, new dojo.Color([150, 150, 150]), 2));
		var c = new esri.Graphic(null, b, null, null);
	
		dojo.connect(clusterLayer.graphics, "onMouseOver", function(a) {
			c.geometry = a.graphic.attributes.extent, map.graphics.add(c)
		});

		dojo.connect(clusterLayer.graphics, "onMouseOut", function(a) {
			map.graphics.remove(c)
		});


#### For Heatmap

1. Include the js files (minified or full versions, with IE polyfill for heatmap layer)

<!--[if lt IE 9]>
    <script type="text/javascript" src="excanvas.compiled.js"></script>
<![endif]-->

<script type="text/javascript" src="heatlayer.js"></script>

2. Initialize the heatmap layer with options. Look at the constructor of the layer for all possible options.
var heatLayer = new modules.HeatLayer(null, {
        opacity: .9,
        visible: !0, //initial visibility
        globalMax: !1 //density based on all points or visible points
    });

3. Add points to heatmap layer where points are an array of objects which has x and y. Example: var points = [{x:12,y:22}]
heatLayer.setData(points);

4. Show or hide the layer
heatLayer.show()  or heatLayer.hide()



## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.


## Licensing

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

[](Esri Tags: ArcGIS JSAPI cluster heatmap feature featureservice many)
[](Esri Language: JavaScript)

