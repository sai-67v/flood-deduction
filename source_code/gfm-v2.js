/*
Flood Deduction & Impact Assessment System

We spent hours to build this for free, if you use the code
or a part of it for your own work, please consider citing us.

Find information on how to cite and more details about the 
project on this GitHub repository:
https://github.com/sai-67v/flood-deduction

*/

// ===== Module: aoiFilter =====
var aoiFilter = require('users/ptripathy/GlobalFloodMapper:countrystates');

// ===== Module: availabilityGraph =====
var availabilityGraph = {
  generateCollectionChart: function(collection) {
    var range = collection.reduceColumns(ee.Reducer.toList(), ["system:time_start"])
        .values().get(0);
    range = ee.List(range)
        .map(function(n){
          return ee.Date(n).format("YYYY-MM-dd");
        });
    
    var availability_dict = range.reduce(ee.Reducer.frequencyHistogram());
    var availability_dict = ee.Dictionary(availability_dict);
    
    var chart = ui.Chart.array.values(availability_dict.values(), 0, availability_dict.keys())
        .setChartType("ColumnChart")
        .setOptions({
          width: 100,
          height: 40,
          title: "Sentinel-1 Image Availability",
          hAxis: {title: 'Date'},
          vAxis: {title: 'Number of images'}
        });
      
    return chart;
  }
};

// ===== Module: availabilityGraphStacked =====
var availabilityGraphStacked = {
  generateCollectionChart: function(collection) {
    var asc_collection = collection.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
    var desc_collection = collection.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
    
    var asc_range = asc_collection.reduceColumns(ee.Reducer.toList(), ["system:time_start"])
        .values().get(0);
    asc_range = ee.List(asc_range)
        .map(function(n){
          return ee.Date(n).format("YYYY-MM-dd");
        });
    var desc_range = desc_collection.reduceColumns(ee.Reducer.toList(), ["system:time_start"])
        .values().get(0);
    desc_range = ee.List(desc_range)
        .map(function(n){
          return ee.Date(n).format("YYYY-MM-dd");
        });
    
    var all_dates = asc_range.distinct().cat(desc_range.distinct()).distinct().sort();
  
    var asc_avail_dict = asc_range.reduce(ee.Reducer.frequencyHistogram());
    var asc_avail_dict = ee.Dictionary(asc_avail_dict);
    var desc_avail_dict = desc_range.reduce(ee.Reducer.frequencyHistogram());
    var desc_avail_dict = ee.Dictionary(desc_avail_dict);
    
    var asc_feat = asc_avail_dict.map(function(date, n){
      return ee.Feature(ee.Geometry.Point(77.58, 13), {label: date, number_images:n, ascending: n, descending: 0, weight:1});
    }).values();
    
    var desc_feat = desc_avail_dict.map(function(date, n){
      return ee.Feature(ee.Geometry.Point(77.58, 13), {label: date, number_images:n, ascending:0, descending: n, weight:1});
    }).values();
    
    var asc_desc = asc_feat.cat(desc_feat);
    var asc_desc_collection = ee.FeatureCollection(asc_desc);
    
    // map over dates
    var merged_collection = ee.FeatureCollection(all_dates.map(function(date){
      var new_feat_collection1 = asc_desc_collection.filter(ee.Filter.equals('label', date));
      var asc_sum = new_feat_collection1.reduceColumns({
        reducer: ee.Reducer.sum(),
        selectors: ['ascending'],
        weightSelectors: ['weight']
        }).get('sum');
      
      var new_feat_collection2 = asc_desc_collection.filter(ee.Filter.equals('label', date));
      var desc_sum = new_feat_collection2.reduceColumns({
        reducer: ee.Reducer.sum(),
        selectors: ['descending'],
        weightSelectors: ['weight']
        }).get('sum');
        
      var merged = asc_desc_collection.filter(ee.Filter.equals('label', date))
        .union().first()
        .set({label:date, Ascending:asc_sum, Descending:desc_sum});
      return(merged);
    }));
    
    // Define the chart and print it to the console.
    var chart = ui.Chart.feature
      .byFeature({
        features: merged_collection.select('Ascending', 'Descending', 'label'),
        xProperty: 'label'
      })
      .setChartType('ColumnChart')
      .setOptions({
        width: 100,
        height: 40,
        title: 'Sentinel-1 Image Availability',
        hAxis: {title: 'Dates', titleTextStyle: {italic: false, bold: true}},
        vAxis: {title: 'Number of images',
                titleTextStyle: {italic: false, bold: true}
        },
        colors: ['C70039', '581845'],
        isStacked: 'absolute'
      });
      
    return(chart);
  }
};

// ===== Module: floodLegend =====
var floodLegend = {
  legend: function() {
    // Add a legend to the maps
    // set position of panel
    var legend = ui.Panel({
      style: {
        position: 'bottom-right',
        padding: '8px 15px'
      }
    });
     
    // Create legend title
    var legendTitle = ui.Label({
      value: 'Flood Map Legend',
      style: {
        fontWeight: 'bold',
        fontSize: '16px',
        margin: '0 0 0 0',
        padding: '0'
        }
    });
     
    // Add the title to the panel
    legend.add(legendTitle);
    
    // Creates and styles 1 row of the legend.
    var makeRow = function(color, name) {
     
          // Create the label that is actually the colored box.
          var colorBox = ui.Label({
            style: {
              backgroundColor: '#' + color,
              // Use padding to give the box height and width.
              padding: '8px',
              margin: '0 0 0 0'
            }
          });
     
          // Create the label filled with the description text.
          var description = ui.Label({
            value: name,
            style: {fontSize: '12px', margin: '0 0 4px 6px'}
          });
     
          // return the panel
          return ui.Panel({
            widgets: [colorBox, description],
            layout: ui.Panel.Layout.Flow('horizontal')
          });
    };
  
    // name of the legend
    var names = ['Permanent Open Water',
                 'High-confidence Flood',
                 'Low-confidence Flood',
                 'Non-water'];
    //  Palette with the colors
    var palette =['031DC9', 'D20103', 'F8E806', 'E3E3E3'];
    // Add color and and names
    for (var i = 0; i < palette.length; i++) {
      legend.add(makeRow(palette[i], names[i]));
      }
      
    legend.add(ui.Label({
      value: 'See details on GitHub',
      style: {fontSize: '12px', margin: '0 0 0 0', padding:'4px'},
      targetUrl: 'https://github.com/sai-67v/flood-deduction'
      }));
      
    return legend;
  }
};

// ===== Module: floodMapExport =====
var floodMapExport = {
  // Internal function to apply consistent smoothing to categorical flood map
  _getSmoothedFlood: function(floodLayer, radiusPixels, aoi) {
    if (radiusPixels <= 0) return floodLayer;
    
    // Define kernel in pixels (matching UI units)
    var kernel = ee.Kernel.square({
      radius: radiusPixels, units: 'pixels', magnitude: 1
    });
    
    var ow = floodLayer.eq(4);
    var high = floodLayer.eq(3);
    var low = floodLayer.eq(1).or(floodLayer.eq(2));
    
    // Smoothen each class
    var sOw = ow.convolve(kernel).gt(0.5);
    var sHigh = high.convolve(kernel).gt(0.5);
    var sLow = low.convolve(kernel).gt(0.5);
    
    // Reassemble with precedence: Water > High Conf > Low Conf
    return ee.Image(0)
      .where(sLow, 1)
      .where(sHigh, 3)
      .where(sOw, 4)
      .clip(aoi);
  },

  // Define a function to smoothen the raster and export the shapefile
  getFloodShpUrl: function(floodLayer, radiusPixels, aoi, cellSize, filename) {
    var smoothed = this._getSmoothedFlood(floodLayer, radiusPixels, aoi);
    
    // non-water export (value 0)
    var non_water_vectors = smoothed.eq(0).selfMask().reduceToVectors({
      geometry: aoi,
      crs: 'EPSG:4326',
      scale: cellSize,
      geometryType: 'polygon',
      eightConnected: false,
      labelProperty: 'zone',
      maxPixels: 9e12
    });

    // low-confidence flood export (values 1 and 2 merged)
    var low_vectors = smoothed.eq(1).selfMask().reduceToVectors({
      geometry: aoi,
      crs: 'EPSG:4326',
      scale: cellSize,
      geometryType: 'polygon',
      eightConnected: false,
      labelProperty: 'zone',
      maxPixels: 9e12
    });
    
    // high-confidence flood export (value 3)
    var high_vectors = smoothed.eq(3).selfMask().reduceToVectors({
      geometry: aoi,
      crs: 'EPSG:4326',
      scale: cellSize,
      geometryType: 'polygon',
      eightConnected: false,
      labelProperty: 'zone',
      maxPixels: 9e12
    });

    // permanent open water export (value 4)
    var permanent_water_vectors = smoothed.eq(4).selfMask().reduceToVectors({
      geometry: aoi,
      crs: 'EPSG:4326',
      scale: cellSize,
      geometryType: 'polygon',
      eightConnected: false,
      labelProperty: 'zone',
      maxPixels: 9e12
    });
    
    var non_water_url = ee.FeatureCollection(non_water_vectors).getDownloadURL({
      format: 'shp',
      filename: filename + '_non_water'
    });

    var low_vector_url = ee.FeatureCollection(low_vectors).getDownloadURL({
      format: 'shp',
      filename: filename + '_low'
    });

    var high_vector_url = ee.FeatureCollection(high_vectors).getDownloadURL({
      format: 'shp',
      filename: filename + '_high'
    });

    var permanent_water_url = ee.FeatureCollection(permanent_water_vectors).getDownloadURL({
      format: 'shp',
      filename: filename + '_permanent_water'
    });

    Export.table.toDrive({
      collection: non_water_vectors,
      description: 'Flood_Map_SHP_NonWater',
      folder:      'Flood_Deduction_Exports',  
      fileNamePrefix: filename + '_non_water',
      fileFormat: 'SHP'
    });

    Export.table.toDrive({
      collection: low_vectors,
      description: 'Flood_Map_SHP_LowConf',
      folder:      'Flood_Deduction_Exports',  
      fileNamePrefix: filename + '_low',
      fileFormat: 'SHP'
    });

    Export.table.toDrive({
      collection: high_vectors,
      description: 'Flood_Map_SHP_HighConf',
      folder:      'Flood_Deduction_Exports',  
      fileNamePrefix: filename + '_high',
      fileFormat: 'SHP'
    });

    Export.table.toDrive({
      collection: permanent_water_vectors,
      description: 'Flood_Map_SHP_PermanentWater',
      folder:      'Flood_Deduction_Exports',  
      fileNamePrefix: filename + '_permanent_water',
      fileFormat: 'SHP'
    });
    
    return ee.List([non_water_url, low_vector_url, high_vector_url, permanent_water_url]);
  },
  
  // Define a function to smoothen the map and export the TIFF
  getFloodTiffUrl: function(floodLayer, radiusPixels, aoi, cellSize, filename) {
    var smoothed = this._getSmoothedFlood(floodLayer, radiusPixels, aoi);
    
    var visParams = {
      min:     0,
      max:     4,
      palette: mapFloods.palette
    };
    var colored = smoothed.visualize(visParams);
    
    var tiff_url = colored.getDownloadURL({
      region: aoi,
      scale: cellSize,
      crs: "EPSG:4326",
      format: 'GEO_TIFF',
      filename: filename
    });

    Export.image.toDrive({
      image: colored,   
      description: 'Flood_Map_TIFF',
      folder:      'Flood_Deduction_Exports_TIFF',
      fileNamePrefix: filename,
      region:      aoi,
      scale:       cellSize,
      crs:         "EPSG:4326",
      fileFormat:  'GeoTIFF'      
    });
    
    return tiff_url;
  }
};

// ===== Module: mapFloods =====
var mapFloods = {
  mapFloods: function(
    z, // ee.Image of z-score with bands "VV" and "VH"
    zvv_thd, // VV Z-score threshold
    zvh_thd, // VH Z-score threshold
    pow_thd,
    elev_thd,
    slp_thd) // Open water threshold (%)
  
    {
    // defaults
    if(!zvv_thd) {
      zvv_thd = -3;
    }
    if(!zvh_thd) {
      zvh_thd = -3;
    }
    if(!pow_thd) {
      pow_thd = 75;
    }
    if(!elev_thd) {
      elev_thd = 800;
    }
    if(!slp_thd) {
      slp_thd = 15;
    }
    
    // JRC water mask
    var jrc = ee.ImageCollection("JRC/GSW1_1/MonthlyHistory")
      .filterDate('2016-01-01', '2019-01-01');
    var jrcvalid = jrc.map(function(x) {return x.gt(0);}).sum();
    var jrcwat = jrc.map(function(x) {return x.eq(2);}).sum().divide(jrcvalid).multiply(100);
    var jrcmask = jrcvalid.gt(0);
    var ow = jrcwat.gte(ee.Image(pow_thd));
    
    // add elevation and slope masking
    var elevation = ee.ImageCollection('COPERNICUS/DEM/GLO30').mosaic().select('DEM');
    var slope = ee.Terrain.slope(elevation);
  
    // Classify floods
    var vvflag = z.select('VV').lte(ee.Image(zvv_thd));
    var vhflag = z.select('VH').lte(ee.Image(zvh_thd));
  
    var flood_class = ee.Image(0)
      .add(vvflag) 
      .add(vhflag.multiply(2))
      .where(ow.eq(1), 4)
      .rename('flood_class')
      //.updateMask(jrcmask)
      .where(elevation.gt(elev_thd).multiply(ow.neq(1)), 0)
      .where(slope.gt(slp_thd).multiply(ow.neq(1)), 0);
  
    return flood_class;
  },
  
  palette: [
    '#E3E3E3', // 0 - non-water; non-flood
    '#F8E806', // 1 - VV only
    '#F8E806', // 2 - VH only
    '#D20103', // 3 - VV + VH
    '#031DC9'  // 4 - Permanent open water
  ]

};

// ===== Module: zScore =====
var zScore = {
  // Reducing an EMPTY image collection yields a 0-band image, and the
  // subtract/divide below then die with "Image.subtract: If one image has no
  // bands, the other must also have no bands. Got 0 and 3." A date window or
  // orbit pass with no Sentinel-1 scenes over the AOI is easy to hit, so the
  // safe reducers below keep the 3-band shape and fall back to a fully-masked
  // image instead. Masked z propagates through the classification, so the
  // flood map comes out empty rather than erroring.
  s1Bands: ['VV', 'VH', 'angle'],

  maskedS1: function() {
    return ee.Image.constant([0, 0, 0])
      .rename(zScore.s1Bands)
      .updateMask(ee.Image(0));
  },

  safeMean: function(collection) {
    return ee.Image(ee.Algorithms.If(
      collection.size().gt(0), collection.mean(), zScore.maskedS1()));
  },

  safeStdDev: function(collection) {
    return ee.Image(ee.Algorithms.If(
      collection.size().gt(0),
      collection.reduce(ee.Reducer.stdDev()).rename(zScore.s1Bands),
      zScore.maskedS1()));
  },

  // Z-score
  calc_zscore: function(s1_collection_t1, s1_collection_t2, mode, direction) {
    var t1 = s1_collection_t1
      .filter(ee.Filter.equals('orbitProperties_pass', direction));
    var t2 = s1_collection_t2
      .filter(ee.Filter.equals('orbitProperties_pass', direction));

    var base_mean = zScore.safeMean(t1);

    var anom = zScore.safeMean(t2)
      .subtract(base_mean)
      .set({'system:time_start': s1_collection_t2.get('system:time_start')});

    var base_sd = zScore.safeStdDev(t1);

    return anom.divide(base_sd)
      .set({'system:time_start': anom.get('system:time_start')});
  }
};

// ===== Module: zScoreBasic =====
var zScoreBasic = {
  // Z-score
  calc_zscore: function(s1_collection_t1, s1_image_t2) {
    var anom = zScore.safeMean(s1_image_t2)
      .subtract(zScore.safeMean(s1_collection_t1))
      .set({'system:time_start': s1_image_t2.get('system:time_start')});

    var basesd = zScore.safeStdDev(s1_collection_t1);

    return anom.divide(basesd)
      .set({'system:time_start': anom.get('system:time_start')});
  }
};

// ===== MAIN APPLICATION CODE =====
var aoi = 0;
var drawnAOI = false; //checks if the aoi displayed is drawn by the user or selected through the dropdowns
var chartWidgets = [null, null]; // tracks the chart widget for left(0)/right(1) panel

// Define a function to update aoi
function updateAoi(level_0, level_1, ret) {
  aoi = ee.FeatureCollection("FAO/GAUL/2015/level1")
        .filter(ee.Filter.equals('ADM0_NAME', level_0))
        .filter(ee.Filter.equals('ADM1_NAME', level_1))
        .geometry();
  if (ret === true) {
    return(aoi);
  }
}

aoi = ee.Geometry.BBox(-51.614718769210214, -30.026983088996428, -51.15466627897584, -29.818991150568596);

if (ui.url.get('pfd0', null) !== null && ui.url.get('country', null) === null) {
  var leftLon  = parseFloat(ui.url.get('llong')),
      leftLat  = parseFloat(ui.url.get('llat')),
      rightLon = parseFloat(ui.url.get('rlong')),
      rightLat = parseFloat(ui.url.get('rlat'));
  aoi = ee.Geometry.Rectangle([ leftLon, leftLat, rightLon, rightLat ]);
}

// Define a default start date
var start_date = [ee.Date('2020-05-01'), ee.Date('2024-05-08')];

var advance_days;
if(ui.url.get('pfd0', null) !== null) {
  var preFloodDays = parseInt(ui.url.get('sd0'));
  var duringFloodDays = parseInt(ui.url.get('sd1'));
  advance_days = [preFloodDays, duringFloodDays];
}
else{
  advance_days = [60, 8];
}
// Create widgets for the advanced version of the app
var init_zvv_thd = -3;
var init_zvh_thd = -3;
var init_pow_thd = 75;
var init_elev_thd = 900;
var init_slp_thd = 15;

// Create text boxes for advanced tool
var zvv_thd_text = ui.Textbox({value: init_zvv_thd,
  onChange: function(value) {
    init_zvv_thd = value;
    updateFloodMap();
  },
  style: {maxWidth: '45px', padding: '0px'}
});
var zvh_thd_text = ui.Textbox({value: init_zvh_thd,
  onChange: function(value) {
    init_zvh_thd = value;
    updateFloodMap();
  },
  style: {maxWidth: '45px', padding: '0px'}
});
var pow_thd_text = ui.Textbox({value: init_pow_thd,
  onChange: function(value) {
    init_pow_thd = value;
    updateFloodMap();
  },
  style: {maxWidth: '45px', padding: '0px'}
});
var elev_thd_text = ui.Textbox({value: init_elev_thd,
  onChange: function(value) {
    init_elev_thd = value;
    updateFloodMap();
  },
  style: {maxWidth: '50px', padding: '0px'}
});
var slp_thd_text = ui.Textbox({value: init_slp_thd,
  onChange: function(value) {
    init_slp_thd = value;
    updateFloodMap();
  },
  style: {maxWidth: '35px', padding: '0px'}
});

var pass_options = ['Combined', 'Separate', 'Ascending', 'Descending'];
var pass_dd = ui.Select({items: pass_options,
  value: 'Combined',
  onChange: function() {
    updateFloodMap();
  }
});

// Modify the function from DeVries to fit the needs
function getFloodImage(s1_collection_t1, s1_collection_t2) {
  // Z-score thresholds using user-defined values
  
  // Compute Z-scores per instrument mode and orbital direction
  if (pass_dd.getValue() == pass_options[0]) {
    var z = zScoreBasic.calc_zscore(s1_collection_t1, s1_collection_t2);
  
  } else if (pass_dd.getValue() == pass_options[1]) {
    var z_iwasc = zScore.calc_zscore(s1_collection_t1, s1_collection_t2, 'IW', 'ASCENDING');
    var z_iwdsc = zScore.calc_zscore(s1_collection_t1, s1_collection_t2, 'IW', 'DESCENDING');
    // DeVries take mosaic because they deal with entire collection and need the last image
    // only. Since the pipeline explicitly passes time 2 collection, mean should be fine.
    var z = ee.ImageCollection.fromImages([z_iwasc, z_iwdsc]).mean();
  
  } else if (pass_dd.getValue() == pass_options[2]) {
    var z = zScore.calc_zscore(s1_collection_t1, s1_collection_t2, 'IW', 'ASCENDING');
    
  } else if (pass_dd.getValue() == pass_options[3]) {
    var z = zScore.calc_zscore(s1_collection_t1, s1_collection_t2, 'IW', 'DESCENDING');
  }
  
  var floods = mapFloods.mapFloods(z, parseInt(init_zvv_thd), parseInt(init_zvh_thd), 
    parseInt(init_pow_thd), parseInt(init_elev_thd), parseInt(init_slp_thd));
  
  return(floods.clip(aoi));
}

// Create a function for getting updated Sentinel-1 collection
function getSentinel1WithinDateRange(date, span) {
  var filters = [
    ee.Filter.listContains("transmitterReceiverPolarisation", "VV"),
    ee.Filter.listContains("transmitterReceiverPolarisation", "VH"),
    ee.Filter.or(
      ee.Filter.equals("instrumentMode", "IW")
      ),
    ee.Filter.bounds(aoi),
    ee.Filter.eq('resolution_meters', 10),
    ee.Filter.date(date, date.advance(span+1, 'day'))
  ];
  
  var s1_collection = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filter(filters);

  return s1_collection;
}

function createS1Composite(s1_collection) {
  var composite = ee.Image.cat([
    s1_collection.select('VH').mean(),
    s1_collection.select('VV').mean(),
    s1_collection.select('VH').mean()
    ]);
    
  return composite.clip(aoi);
}

// Create a function for getting updated Sentinel-2 collection
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask);
}

function getSentinel2WithinDateRange(date, span) {
  var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                    .filterBounds(aoi)
                    .filterDate(date, date.advance(span+1, 'day'))
                    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 70))
                    .map(maskS2clouds)
                    .select('B4', 'B3', 'B2');
                    
  return sentinel2.mean().clip(aoi);
}

// Create a function to generate Image dynamically
function getS1Image(index) {
  var s1_collection = getSentinel1WithinDateRange(start_date[index], advance_days[index]);
  return createS1Composite(s1_collection);
}

function getS2Image(index) {
  return getSentinel2WithinDateRange(start_date[index], advance_days[index]);
}

var s1RawVizParams = {min: [-25, -20, -25], max: [0, 10, 0]};
var s2RawVizParams = {bands: ['B4', 'B3', 'B2'], max: 3048, gamma: 1};
var show_left_sar = true;
var show_right_sar = true;
var show_left_optical = false;
var show_right_optical = false;
var selectedState;
var selectedCountry;

// Adds a layer selection widget to the given map, to allow users to change
