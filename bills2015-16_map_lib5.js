/*jslint browser: true*/
/*global $, google, jQuery, console, alert*/
/*jshint multistr: true */

/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 12/10/2012
 *
 */

var MapsLib = MapsLib || {};
var MapsLib = {

    //Setup section - put your Fusion Table details here
    //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

    //the encrypted Table ID of your Fusion Table (found under File => About)
    //NOTE: numeric IDs will be depricated soon
    fusionTableId: "1hG3WwbAJXbLJD5OEPL4LKrSWkTj6pzzwTt9Ussmx",


    //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
    //*Important* this key is for demonstration purposes. please register your own.
    googleApiKey: "AIzaSyBHnYpEqDQaRrMF_TNRvbTZhmPEKEsw_2E",

    //name of the location column in your Fusion Table.
    //NOTE: if your location column name has spaces in it, surround it with single quotes
    //example: locationColumn:     "'my location'",
    locationColumn: "geometry",

    map_centroid: new google.maps.LatLng(38.40625379485267, -98.2383671845704), //center that your map defaults to
    locationScope: "", //geographical area appended to all address searches
    recordName: "bill", //for showing number of results
    recordNamePlural: "bills",

    searchRadius: 5, //in meters; orignal default 805 ~ 1/2 mile
    defaultZoom: 7, //zoom level when map is loaded (bigger is more zoomed in)
    orderBy: "Year",	//order by field in database
    addrMarkerImage: 'http://derekeder.com/images/icons/blue-pushpin.png',
    currentPinpoint: null,

    initialize: function () {
        $("#result_count").html("");
        $("#rbType1").attr("checked", "checked");
        $("#results_list").hide();
        $("#result_count").hide();

        geocoder = new google.maps.Geocoder();
        var myOptions = {
            zoom: MapsLib.defaultZoom,
            center: MapsLib.map_centroid,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map($("#map_canvas")[0], myOptions);

        // maintains map centerpoint for responsive design
        google.maps.event.addDomListener(map, 'idle', function () {
            MapsLib.calculateCenter();
        });

        google.maps.event.addDomListener(window, 'resize', function () {
            map.setCenter(MapsLib.map_centroid);
        });

        MapsLib.searchrecords = null;

        //reset filters
        $("#search_address").val(MapsLib.convertToPlainString($.address
            .parameter('address')));
        var loadRadius = MapsLib.convertToPlainString($.address.parameter(
            'radius'));
        if (loadRadius !== "") $("#search_radius").val(loadRadius);
        else $("#search_radius").val(MapsLib.searchRadius);
        $(":checkbox").attr("checked", "checked");
        //$("#order_by").val('LN_ASC');
        $("#results_list").hide();
        $("#result_count").hide();


        //run the default search
        MapsLib.doSearch();
    },

    doSearch: function(location) {
        "use strict";
        MapsLib.clearSearch();
        var address, whereClause, type_column1, type_column2,
            type_column3, tempWhereClause;
        address = $("#search_address").val();
        MapsLib.searchRadius = $("#search_radius").val();

        whereClause = MapsLib.locationColumn + " not equal to ''";


        //-----custom filters-------

        type_column1 = "'Floor'";
        tempWhereClause = [];
        if ($("#cbType1").is(':checked')) tempWhereClause.push("House");
        if ($("#cbType2").is(':checked')) tempWhereClause.push("Senate");
        whereClause += " AND " + type_column1 + " IN ('" +
            tempWhereClause.join('\',\'') + "')";

        type_column2 = "'Year'";
        tempWhereClause = [];
        if ($("#cbType3").is(':checked')) tempWhereClause.push("2015");
        if ($("#cbType4").is(':checked')) tempWhereClause.push("2016");
        whereClause += " AND " + type_column2 + " IN ('" +
            tempWhereClause.join('\',\'') + "')";

        type_column3 = "'Action'";
        tempWhereClause = [];
        if ($("#cbType5").is(':checked')) tempWhereClause.push(
            "Pending");
        if ($("#cbType6").is(':checked')) tempWhereClause.push(
            "Monitor");
        if ($("#cbType7").is(':checked')) tempWhereClause.push(
            "Support");
        if ($("#cbType8").is(':checked')) tempWhereClause.push("Oppose");
        whereClause += " AND " + type_column3 + " IN ('" +
            tempWhereClause.join('\',\',\',\'') + "')";

        //-------end of custom filters--------

        if (address !== "") {
            if (address.toLowerCase().indexOf(MapsLib.locationScope) ==
                -1)
                address = address + " " + MapsLib.locationScope;

            geocoder.geocode({
                'address': address
            }, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    MapsLib.currentPinpoint = results[0].geometry
                        .location;

                    $.address.parameter('address',
                        encodeURIComponent(address));
                    $.address.parameter('radius',
                        encodeURIComponent(MapsLib.searchRadius)
                    );
                    map.setCenter(MapsLib.currentPinpoint);
                    map.setZoom(14);

                    MapsLib.addrMarker = new google.maps.Marker({
                        position: MapsLib.currentPinpoint,
                        map: map,
                        icon: MapsLib.addrMarkerImage,
                        animation: google.maps.Animation
                            .DROP,
                        title: address
                    });

                    whereClause += " AND ST_INTERSECTS(" +
                        MapsLib.locationColumn +
                        ", CIRCLE(LATLNG" + MapsLib.currentPinpoint
                        .toString() + "," + MapsLib.searchRadius +
                        "))";

                    MapsLib.drawSearchRadiusCircle(MapsLib.currentPinpoint);
                    MapsLib.submitSearch(whereClause, map,
                        MapsLib.currentPinpoint);
                } else {
                    alert("We could not find your address: " +
                        status);
                }
            });
        } else { //search without geocoding callback
            MapsLib.submitSearch(whereClause, map);
        }
    },

    submitSearch: function(whereClause, map, location) {
        //get using all filters
        //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
        //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
        //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles

        MapsLib.searchrecords = new google.maps.FusionTablesLayer({
            query: {
                from: MapsLib.fusionTableId,
                select: MapsLib.locationColumn,
                where: whereClause
            },
            styleId: 2,
            templateId: 2
        });
        MapsLib.searchrecords.setMap(map);
        MapsLib.getCount(whereClause);
        MapsLib.getList(whereClause);
    },

    clearSearch: function () {
        if (MapsLib.searchrecords !== null)
            MapsLib.searchrecords.setMap(null);
        if (MapsLib.addrMarker !== null)
            MapsLib.addrMarker.setMap(null);
        if (MapsLib.searchRadiusCircle !== null)
            MapsLib.searchRadiusCircle.setMap(null);
    },

    findMe: function () {
        // Try W3C Geolocation (Preferred)
        var foundLocation;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                foundLocation = new google.maps.LatLng(position
                    .coords.latitude, position.coords.longitude
                );
                MapsLib.addrFromLatLng(foundLocation);
            }, null);
        } else {
            alert("Sorry, we could not find your location.");
        }
    },

    addrFromLatLng: function(latLngPoint) {
        geocoder.geocode({
            'latLng': latLngPoint
        }, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[1]) {
                    $('#search_address').val(results[1].formatted_address);
                    $('.hint').focus();
                    MapsLib.doSearch();
                }
            } else {
                alert("Geocoder failed due to: " + status);
            }
        });
    },

    drawSearchRadiusCircle: function(point) {
        var circleOptions = {
            strokeColor: "#4b58a6",
            strokeOpacity: 0.3,
            strokeWeight: 1,
            fillColor: "#4b58a6",
            fillOpacity: 0.05,
            map: map,
            center: point,
            clickable: false,
            zIndex: -1,
            radius: parseInt(MapsLib.searchRadius)
        };
        MapsLib.searchRadiusCircle = new google.maps.Circle(
            circleOptions);
    },

    query: function(selectColumns, whereClause, callback, orderColumn) {

        var orderColumn = $("#order_by option:selected").val();
        var queryStr = [];
        queryStr.push("SELECT " + selectColumns);
        queryStr.push(" FROM " + MapsLib.fusionTableId);
        queryStr.push(" WHERE " + whereClause);
        queryStr.push(" ORDER BY " + orderColumn);
        var sql = encodeURIComponent(queryStr.join(" "));

        $.ajax({
            url: "https://www.googleapis.com/fusiontables/v2/query?sql=" +
                sql + "&callback=" + callback + "&key=" +
                MapsLib.googleApiKey,
            dataType: "jsonp"
        });
    },

    /* Example query
https://www.googleapis.com/fusiontables/v1/query?sql=SELECT+ROWID%2C+First_Name%2C+Last_Name%2C+District%2C+Party%2C+Gender%2C+Photo%2C+Phone%2C+Email%2C+Webpage+FROM+1YTu1FnBovWboMdQHdWO7i3uc4tGknjtnNjU_FGM+ORDER+BY+District+DESC&key=AIzaSyBHnYpEqDQaRrMF_TNRvbTZhmPEKEsw_2E
*/

    handleError: function(json) {
        if (json["error"] !== undefined) {
            var error = json["error"]["errors"]
            console.log("Error in Fusion Table call!");
            for (var row in error) {
                console.log(" Domain: " + error[row]["domain"]);
                console.log(" Reason: " + error[row]["reason"]);
                console.log(" Message: " + error[row]["message"]);
            }
        }
    },

    getCount: function(whereClause) {
        var selectColumns = "Count()";
        MapsLib.query(selectColumns, whereClause,
            "MapsLib.displaySearchCount");
    },

    displaySearchCount: function(json) {
        MapsLib.handleError(json);
        var numRows = 0;
        if (json["rows"] !== null)
            numRows = json["rows"][0];

        var name = MapsLib.recordNamePlural;
        if (numRows == 1)
            name = MapsLib.recordName;
        $("#result_count").fadeOut(function () {
            $("#result_count").html(MapsLib.addCommas(numRows) +
                " " + name + " of ");
        });
        $("#result_count").fadeIn();
    },

    getList: function(whereClause) {
        var selectColumns = "* ";
        MapsLib.query(selectColumns, whereClause, "MapsLib.displayList");
    },

    displayList: function(json) {
        MapsLib.handleError(json);
        var data = json["rows"];
        var template = "";

        var results = $("#results_list");
        results.hide().empty(); //hide the existing list and empty it out first

        if (data === null) {
            //clear results list
            results.append(
                "<li><span class='lead'>No results found</span></li>"
            );
        } else {
            for (var row in data) {
                var test1, test2, test3, test4;
                test1 = data[row][7];
                test2 = data[row][8];
                test3 = data[row][9];
                test4 = data[row][10];
                test5 = data[row][11];
                console.log(test1);
                /*if(test1 !== "") {
            "<a href='" + test1 + "'><img src='http://www.ksbar.org/resource/resmgr/jquery/ui-kba-icons_approve_26x26.png' /></a>" }
        
        if(test2 !== "") {
            "<a href='" + test2 + "'><img src='http://www.ksbar.org/resource/resmgr/jquery/ui-kba-icons_approve_26x26.png' /></a>" }
        
        if(test3 !== "") {
            "<a href='" + test3 + "'><img src='http://www.ksbar.org/resource/resmgr/jquery/ui-kba-icons_approve_26x26.png' /></a>" }
        
        if(test4 !== "") {
            "<a href='" + test4 + "'><img src='http://www.ksbar.org/resource/resmgr/jquery/ui-kba-icons_approve_26x26.png' /></a>" }
        */
                template = "\
        <tr class='" + data[row][3] +
                    "'>\
            <td class='bill'><a href='" + data[row][4] +
                    "' target='_blank' class='bold'>" + data[row][0] +
                    "</a></td>" +
                    "\
            <td class='description'>" + data[row]
                    [1] + "</td>" +
                    "\
            <td class='section'>" + data[row][2] +
                    "</td>" + "\
            <td class='action'>" +
                    data[row][3] + "</td>" +
                    "\
            <td class='testimony'>" + test1 +
                    /* test2 + test3 + test4 + test5 + */
                    "\
            </td></tr>"
                results.append(template);
            }
        }
        results.fadeIn();
    },

    addCommas: function(nStr) {
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    },

    // maintains map centerpoint for responsive design
    calculateCenter: function () {
        center = map.getCenter();
    },

    //converts a slug or query string in to readable text
    convertToPlainString: function(text) {
        if (text === undefined) return '';
        return decodeURIComponent(text);
    }
}

/*   $(window).resize(function () {
          var h = $(window).height(),
            offsetTop = 200; // Calculate the top offset
        
          $('#map_canvas').css('height', (h - offsetTop));
        }).resize();
      */
$(function () {
            MapsLib.initialize();
            $("#search_address").geocomplete();

            $(':checkbox').click(function () {
                MapsLib.doSearch();
            });

            $(':radio').click(function () {
                MapsLib.doSearch();
            });

            $('#search_radius').change(function () {
                MapsLib.doSearch();
            });

            $('#search').click(function () {
                MapsLib.doSearch();
            });

            $('#find_me').click(function () {
                MapsLib.findMe();
                return false;
            });

            $('#order_by').change(function () {
                MapsLib.doSearch();
            });

            $('#reset').click(function () {
                $.address.parameter('address', '');
                MapsLib.initialize();
                return false;
            });

            $(":text").keydown(function(e) {
                var key = e.keyCode ? e.keyCode : e.which;
                if (key == 13) {
                    $('#search').click();
                    return false;
                }
            });
 });