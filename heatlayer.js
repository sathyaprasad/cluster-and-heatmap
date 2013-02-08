dojo.provide("modules.HeatLayer");

dojo.addOnLoad(function() {
  
  dojo.declare("modules.HeatLayer", esri.layers.Layer, {
    
    // Doc: http://docs.dojocampus.org/dojo/declare#chaining
    "-chains-": {
      constructor: "manual"
    },
    
    constructor: function(data, options) {
      // Manually call superclass constructor with required arguments
      this.inherited(arguments, [ "http://some.server.com/path", options ]);
      var id = options.id || ("HeatMapLayer" + Math.ceil(Math.random(100) * 100))
	  this.id = id;
      this.data = data;
	  this.pxgrid = options.pixelsSquare || 128;

	this.pattern = [
		{
			start:2,
			red:function(alpha){ return 200 },
			green:function(alpha){ return 200 },
			blue:function(alpha){ return 200 },
			alpha:function(alpha){ return Math.max(40,alpha) }			
		},
		{
			start:51,
			red:function(alpha){ return 151 },
			green:function(alpha){ return 150 },
			blue:function(alpha){ return 155 },
			alpha:function(alpha){ return alpha }			
		},
		{
			start:102,
			red:function(alpha){ return 117 },
			green:function(alpha){ return 114 },
			blue:function(alpha){ return 111 },
			alpha:function(alpha){ return alpha }			
		},
		{
			start:153,
			red:function(alpha){ return 97 },
			green:function(alpha){ return 97 },
			blue:function(alpha){ return 98 },
			alpha:function(alpha){ return alpha }			
		},
		{
			start:204,
			red:function(alpha){ return 40 },
			green:function(alpha){ return 40 },
			blue:function(alpha){ return 49 },
			alpha:function(alpha){ return alpha }			
		}
	];

      this.loaded = true;
      this.onLoad(this);
    },
    
    /******************************
     * esri.layers.Layer Interface
     ******************************/
    
    _setMap: function(map, container) {
      this._map = map;
	  
		var element;

      if((dojo.isIE) && (dojo.isIE <= 8)){
        // excanvas.js for browsers without HTML5 Canvas support (IE < 9)
		var element = document.createElement('canvas');
		container.appendChild(element);
        element = G_vmlCanvasManager.initElement(element);
		element.setAttribute("width", map.width);
		element.setAttribute("height", map.height);
		element.setAttribute("position", "absolute");
		element.setAttribute("left", "0px");
		element.setAttribute("top", "0px");
      }
	  else{
		element = this._element = dojo.create("canvas", {
			width: map.width + "px",
			height: map.height + "px",
			style: "position: absolute; left: 0px; top: 0px;"
		}, container);
	  }
	  this._element = element;
      
      if (esri._isDefined(this.opacity)) {
        dojo.style(element, "opacity", this.opacity);
      }

      // globalMax: whether dot heat scale is constant for all areas (set to true), or relative within the current extent (set to false)
      if (!esri._isDefined(this.globalMax)) {
        this.globalMax = true;
      }
      // dotRadius: maximum size of a dot
      if (!esri._isDefined(this.dotRadius)) {
        this.dotRadius = 50;
      }
            
      this._context = element.getContext("2d");
      if (!this._context) {
        console.error("This browser does not support <canvas> elements.");
      }
      
      this._mapWidth = map.width;
      this._mapHeight = map.height;
      
      // Event connections
      this._connects = [];
      this._connects.push(dojo.connect(map, "onPan", this, this._panHandler));
      this._connects.push(dojo.connect(map, "onExtentChange", this, this._extentChangeHandler));
      this._connects.push(dojo.connect(map, "onZoomStart", this, this.clear));
      this._connects.push(dojo.connect(this, "onVisibilityChange", this, this._visibilityChangeHandler));
      this._connects.push(dojo.connect(this, "onOpacityChange", this, this._opacityChangeHandler));
      
      // Initial rendering
      //this._delta = { x: 0, y: 0 };
	  this._connects.push(dojo.connect(this._map, "onZoomEnd", this, this.regrid));
      this._drawHeatData();
      
      return element;
    },
    
    _unsetMap: function(map, container) {
      dojo.forEach(this._connects, dojo.disconnect, dojo);
      if (this._element) {
        container.removeChild(this._element);
      }
      this._map = this._element = this._context = this.data = this._connects = null;
    },
    
    setOpacity: function(o) {
      if (this.opacity != o) {
        this.onOpacityChange(this.opacity = o);
      }
    },
    
    onOpacityChange: function() {},
	
	regrid: function(){
		this.setData(this.lastDataset);
	},
    
    /*****************
     * Public Methods
     *****************/
    
    setData: function(dataPoints) {
	  this.lastDataset = dataPoints;
      var clusteredData = {};
	  var gridSquaresWide = (dojo.coords(this._map.id).w * 1) / (this.pxgrid * 1);
	  var gridSquareDivisor = (this._map.extent.xmax - this._map.extent.xmin) / gridSquaresWide;
	  clusteredData["gridsquare"] = gridSquareDivisor;
      dojo.forEach(dataPoints, function(geoPoint){
		var geoKey = Math.round(geoPoint.y/gridSquareDivisor)+"|"+Math.round(geoPoint.x/gridSquareDivisor);
		if(clusteredData[geoKey]){
			clusteredData[geoKey].count += 1;
			clusteredData[geoKey].avgx += ((geoPoint.x - clusteredData[geoKey].avgx) / clusteredData[geoKey].count)
			clusteredData[geoKey].avgy += ((geoPoint.y - clusteredData[geoKey].avgy) / clusteredData[geoKey].count)
		}
		else{
			clusteredData[geoKey] = {
				count: 1,
				avgx: geoPoint.x,
				avgy: geoPoint.y
			}
		}
      });

      this.data = { data: clusteredData, noDataValue: [0] };
      clusteredData = {};
	  
      this.refresh();
    },
    
    refresh: function() {
      if (!this._canDraw()) {
        return;
      }

      this._drawHeatData();
    },
    
    clear: function() {
      if (!this._canDraw()) {
        return;
      }

      this._context.clearRect(0, 0, this._mapWidth, this._mapHeight);
    },
	
	getColorValues: function() {
      var colors = [];
	    var colorVals = [0.01,0.25,0.5,0.75,1];
		dojo.forEach(colorVals, dojo.hitch(this, function(cv){
			for(var block=0;block<this.pattern.length;block++){
				if((block == this.pattern.length-1) || (this.pattern[block+1].start >= cv*255)){
					var red = Math.floor(this.pattern[block].red( cv*255 ));
					var green = Math.floor(this.pattern[block].green( cv*255 ));
					var blue = Math.floor(this.pattern[block].blue( cv * 255 ));
					var alpha = this.pattern[block].alpha( cv * 255 ) * this.opacity / 255;
					colors.push('rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')' );
					return;
				}
			}
		}));
      return colors;
	},
	
    getRange: function() {
      var data = this.data;
      if (!data) {
        return;
      }
      
      var dataArray = data.data, noDataValue = data.noDataValue[0];
      var maxValue = 0;
      var minValue = 0;
      for(var key in dataArray){
        if(dataArray.hasOwnProperty(key)){
          var val = dataArray[key].count;
          if(val == noDataValue){
            continue;
          }
          if(val > maxValue){
            maxValue = val;
          }
          if(val < minValue){
            minValue = val;
          }
        }
      }
      return { min: minValue, max: maxValue };
    },
    
    getDatasetRange: function() {
      var data = this.data;
      if (!data) {
        return;
      }
      
      var rasterProps = data.rasterProperties;
      if (rasterProps) {
        return { min: rasterProps.datasetMin, max: rasterProps.datasetMax };
      }
    },
    
    /*******************
     * Internal Methods
     *******************/
    
    _canDraw: function() {
      return (this._map && this._element && this._context) ? true : false; 
    },
    
    _panHandler: function(extent, delta) {
      dojo.style(this._element, { left: delta.x + "px", top: delta.y + "px" });
    },
    
    _extentChangeHandler: function(extent, delta, levelChange, lod) {
      if (!levelChange) {
        dojo.style(this._element, { left: "0px", top: "0px" /*, width: this._map.width, height: this._map.height*/ });
        this.clear();
      }
      
      this._drawHeatData();
    },
    
    _drawHeatData: function() {

      this.clear();
      if (!this.data) {
        return;
      }
  
      //console.log("Drawing heatmap data in a canvas element...");
      var data = this.data, noDataValue = data.noDataValue[0], dataArray = data.data;
      
      // Statistics
      var range = this.getRange();
      var minValue = range.min, maxValue = range.max;
	  if((minValue == maxValue)&&(maxValue == 0)){
		return;
	  }
      //console.log("Min = ", minValue, ", Max = ", maxValue);
      
      var map = this._map;
      
      // Create color functions
      var posFunc = (maxValue > 0) ? this._getCFForPositiveValues(minValue, maxValue) : null;
      var negFunc = (minValue < 0) ? this._getCFForNegativeValues(minValue, maxValue) : null;
      
      var getShade = function(val) {
        if (val >= 0) {
          return posFunc(val);
        }
        else {
          return negFunc(val);
        }
      };
      
      // Draw
      var ctx = this._context;
      if((!dojo.isIE) || (dojo.isIE > 8)){
        for(var key in dataArray){
		  if(key == "gridsquare"){ continue }
          if(dataArray.hasOwnProperty(key)){
            var onMapPix = this._map.toScreen(new esri.geometry.Point( dataArray[key].avgx, dataArray[key].avgy, map.spatialReference ));
            if(!onMapPix){
              continue;
            }
            var xval = onMapPix.x;
            var yval = onMapPix.y;
            value = dataArray[key].count;
            var dotGrader;
            // render the alpha values first, to determine dots' overlap
            if(value/range.max > 0.3){
              dotGrader = ctx.createRadialGradient(xval,yval,Math.round(this.dotRadius/8,0),xval,yval,this.dotRadius);
              dotGrader.addColorStop(0.1,'rgba(0,0,0,'+(value/range.max)+')');
              dotGrader.addColorStop(0.7,'rgba(0,0,0,'+(value/range.max/2)+')');
              dotGrader.addColorStop(1,'rgba(0,0,0,0)');
            }
            else{
              // dots of lesser importance should still be visibile
              dotGrader = ctx.createRadialGradient(xval,yval,Math.round(this.dotRadius/8,0),xval,yval,Math.round(this.dotRadius/1.5,0));
              dotGrader.addColorStop(0.1,'rgba(0,0,0,'+(2*value/range.max)+')');
              dotGrader.addColorStop(0.7,'rgba(0,0,0,'+(1.5*value/range.max)+')');
              dotGrader.addColorStop(1,'rgba(0,0,0,0)');
            }
            ctx.fillStyle = dotGrader;
            ctx.fillRect(xval-this.dotRadius,yval-this.dotRadius,2*this.dotRadius,2*this.dotRadius);
          }
        }
        // review the entire image, and add color gradients based on the alpha value (combined heat) of overlapping dots
        var imageStore = ctx.getImageData(0,0,this._element.width,this._element.height);
        var imageOut = imageStore.data;
        for(var pix=0;pix<imageOut.length;pix+=4){
		  if(imageOut[pix+3] == 0){ continue }
		  for(var block=0;block<this.pattern.length;block++){
		  	if((block == this.pattern.length-1) || (this.pattern[block+1].start >= imageOut[pix+3])){
				imageOut[pix] = this.pattern[block].red( imageOut[pix+3] );
				imageOut[pix+1] = this.pattern[block].green( imageOut[pix+3] );
				imageOut[pix+2] = this.pattern[block].blue( imageOut[pix+3] );
				imageOut[pix+3] = this.pattern[block].alpha( imageOut[pix+3] );
				break;
			}
		  }
	    }
        imageStore.data = imageOut;
        ctx.putImageData(imageStore,0,0);
	  }
	  else{
        for(var key in dataArray){
          if(dataArray.hasOwnProperty(key)){
  		    if(key == "gridsquare"){ continue }
            var onMapPix = this._map.toScreen(new esri.geometry.Point( dataArray[key].avgx, dataArray[key].avgy, map.spatialReference ));
            if(!onMapPix){
              continue;
            }
            var xval = onMapPix.x;
            var yval = onMapPix.y;
            value = dataArray[key].count;
            var dotGrader;
            // render the alpha values first, to determine dots' overlap
            if(value/range.max > 0.3){
              dotGrader = ctx.createRadialGradient(xval,yval,Math.round(this.dotRadius/4,0),xval,yval,this.dotRadius);
              dotGrader.addColorStop(0.1,'rgba(255,200,210,'+(value/range.max)+')');
              dotGrader.addColorStop(0.7,'rgba(255,0,0,'+(value/range.max/2)+')');
              dotGrader.addColorStop(1,'rgba(160,0,0,0)');
            }
            else{
              // dots of lesser importance should still be visibile
              dotGrader = ctx.createRadialGradient(xval,yval,Math.round(this.dotRadius/8,0),xval,yval,Math.round(this.dotRadius/6,0));
              dotGrader.addColorStop(0.1,'rgba(255,200,210,'+(2*value/range.max)+')');
              dotGrader.addColorStop(0.7,'rgba(255,0,0,'+(1.5*value/range.max)+')');
              dotGrader.addColorStop(1,'rgba(160,0,0,0)');
            }
            ctx.fillStyle = dotGrader;
            ctx.fillRect(xval-this.dotRadius,yval-this.dotRadius,2*this.dotRadius,2*this.dotRadius);
          }
        }
	  }
      dataArray = null;
      //console.log("Done.");
    },
	
	setHeatColors: function(pattern){
		this.pattern = pattern;
	},
    
    _getCFForPositiveValues: function(min, max) {
      if (min < 0) {
        min = 0;
      }
      
      var interval = 255 / (max - min);
      
      return function(val) {
        return "rgb(" + Math.floor((val - min) * interval) + ", 0, 0)";
      };
    },
    
    _getCFForNegativeValues: function(min, max) {
      if (max > 0) {
        max = 0;
      }
      
      var interval = 255 / (max - min);
      
      return function(val) {
        return "rgb(0, 0, " + Math.floor((val - min) * interval) + ")";
      };
    },
    
    /****************
     * Miscellaneous
     ****************/
    
    _visibilityChangeHandler: function(visible) {
      if (visible) {
        esri.show(this._element);
      }
      else { 
        esri.hide(this._element);
      }
    },
    
    _opacityChangeHandler: function(value) {
      dojo.style(this._element, "opacity", value);
    }
  }); // end of class declaration
  
}); // end of addOnLoad


dojo.declare("modules.RasterRenderer", null, {
  getColor: function(value) {
    // Implemented by subclasses
    // Returns: color string. rgb(<r>, <g>, <b>) or rgb(<r>, <g>, <b>, <a>)
  }
});

dojo.declare("modules.MyRasterRenderer", modules.RasterRenderer, {
  constructor: function(parameters) {
    
  },
  
  getColor: function(value) {
    
  }
  
  /*******************
   * Internal Methods
   *******************/
});