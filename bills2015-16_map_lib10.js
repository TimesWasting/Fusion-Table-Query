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

var BillsLib = BillsLib || {};
BillsLib = {

        //the encrypted Table ID of your Fusion Table (found under File => About)
    fusionTableId: "1hG3WwbAJXbLJD5OEPL4LKrSWkTj6pzzwTt9Ussmx",

        // Fusion Tables Requirement: API key. Found at https://code.google.com/apis/console/
    googleApiKey: "AIzaSyBHnYpEqDQaRrMF_TNRvbTZhmPEKEsw_2E",

        //for showing number of results
    recordName: "bill",
    recordNamePlural: "bills",

        //orderBy: "Year",	//order by field in database (if you want descending, put DESC after the column title)
    keyColumn: "Bill",
    initialize: function () {
        "use strict";
        $("#result_count").html("");
        $("#rbType1").attr("checked", "checked");
        $("#results_list").hide();
        $("#result_count").hide();

        BillsLib.searchrecords = null;

        //reset filters
        $(":checkbox").attr("checked", "checked");
        //$("#order_by").val("Year");
        $("#results_list").hide();
        $("#result_count").hide();
        $("search_bills").val("");


        //run the default search
        BillsLib.doSearch();
    },

    doSearch: function (location) {
        "use strict";
        //BillsLib.clearSearch();
        var address, whereClause, type_column1, type_column2, type_column3, tempWhereClause;

        whereClause = BillsLib.keyColumn + " not equal to ''";

        //-----custom filters-------

        type_column1 = "'Floor'";
        tempWhereClause = [];
        if ($("#cbType1").is(':checked')) {tempWhereClause.push("House");
                                          }
        if ($("#cbType2").is(':checked')) {tempWhereClause.push("Senate");
                                          }
        whereClause += " AND " + type_column1 + " IN ('" + tempWhereClause.join('\',\'') + "')";
/*
        type_column2 = "'Year'";
        tempWhereClause = [];
        if ($("#cbType3").is(':checked')) {tempWhereClause.push("2015");
                                          }
        if ($("#cbType4").is(':checked')) {tempWhereClause.push("2016");
                                          }
        whereClause += " AND " + type_column2 + " IN ('" + tempWhereClause.join('\',\'') + "')";

        type_column3 = "'Action'";
        tempWhereClause = [];
        if ($("#cbType5").is(':checked')) {tempWhereClause.push("Pending");
                                          }
        if ($("#cbType6").is(':checked')) {tempWhereClause.push("Monitor");
                                          }
        if ($("#cbType7").is(':checked')) {tempWhereClause.push("Support");
                                          }
        if ($("#cbType8").is(':checked')) {tempWhereClause.push("Oppose");
                                          }
        whereClause += " AND " + type_column3 + " IN ('" + tempWhereClause.join('\',\',\',\'') + "')";
 */
            //-------end of custom filters--------

            // Sends filters to search function
        BillsLib.submitSearch(whereClause);
    },
        
    submitSearch: function (whereClause) {
        "use strict";
        //get using all filters
        BillsLib.getCount(whereClause);
        BillsLib.getList(whereClause);
    },
        
    query: function (selectColumns, whereClause, callback, orderColumn) {
        "use strict";
        orderColumn = $("#order_by option:selected").val();
        var queryStr, sql;
        queryStr = [];
        queryStr.push("SELECT " + selectColumns);
        queryStr.push(" FROM " + BillsLib.fusionTableId);
        queryStr.push(" WHERE " + whereClause);
        queryStr.push("ORDER BY " + orderColumn);
        sql = encodeURIComponent(queryStr.join(" "));
        console.log(queryStr);
        console.log(sql);
        $.ajax({
            url: "https://www.googleapis.com/fusiontables/v2/query?sql=" + sql +
                "&callback=" + callback + "&key=" + BillsLib.googleApiKey,
            dataType: "jsonp"
        });
    },

    /* Example query
https://www.googleapis.com/fusiontables/v2/query?sql=SELECT+ROWID%2C+First_Name%2C+Last_Name%2C+District%2C+Party%2C+Gender%2C+Photo%2C+Phone%2C+Email%2C+Webpage+FROM+1YTu1FnBovWboMdQHdWO7i3uc4tGknjtnNjU_FGM+ORDER+BY+District+DESC&key=AIzaSyBHnYpEqDQaRrMF_TNRvbTZhmPEKEsw_2E
*/

    handleError: function (json) {
        "use strict";
        if (json["error"] !== undefined) {
            var row, error;
            error = json["error"]["errors"];
            console.log("Error in Fusion Table call!");
            for (row in error) {
                console.log(" Domain: " + error[row]["domain"]);
                console.log(" Reason: " + error[row]["reason"]);
                console.log(" Message: " + error[row]["message"]);
            }
        }
    },

    getCount: function (whereClause) {
        "use strict";
        var selectColumns = "Count()";
        BillsLib.query(selectColumns, whereClause,
            "BillsLib.displaySearchCount");
    },

    displaySearchCount: function (json) {
        "use strict";
        BillsLib.handleError(json);
        var numRows, name;
        numRows = 0;
        if (json["rows"] !== null) {
            numRows = json["rows"][0];
        }

        name = BillsLib.recordNamePlural;
        if (numRows === 1) {
            name = BillsLib.recordName;
            $("#result_count").fadeOut(function () {
                $("#result_count").html(BillsLib.addCommas(numRows) + " " + name);
            });
            $("#result_count").fadeIn();
        }
    },

    getList: function (whereClause) {
        "use strict";
        var selectColumns = "Bill, Description, Section, Action, Bill_Link, Year, Floor, Test1, Test2, Test3, Test4, Test5, Test6,"; selectColumns += " Test7, Test8, Test9, Test10, Test11, Test12";
        BillsLib.query(selectColumns, whereClause, "BillsLib.displayList");
    },

    displayList: function (json) {
        "use strict";
        BillsLib.handleError(json);
        var testIcon, data, template, results_list, row;
        testIcon = "https://www.ksbar.org/resource/resmgr/jquery/ui-kba-icons_approve_26x26.png";
        data = json["rows"];
        template = "";

        results_list = $("#results_list");
        results_list.hide().empty(); //hide the existing list and empty it out first

        if (data === null) {
            //clear results list
            results_list.append(
                "<li><span class='lead'>No results found</span></li>"
            );
        } else {
            for (row in data) {
                //var results_list = $("#results_list");        
                var test, bill, descrip, section, action, link, year, floor, billLink, testimony, i, cellIf;
                
                bill = data[row][0];
                descrip = data[row][1];
                section = data[row][2];
                action = data[row][3];
                link = data[row][4];
                year = data[row][5];
                floor = data[row][6];
                    
                billLink = "<a href='" + link + "' id='" + bill + "_legislative_bill-tracking' />" + bill + "</a> ";

                //start of variable rows (refers to "for & if statements below)
                testimony = [];
                for (i = 7; i < data[row].length; i++) {
                    cellIf = data[row][i];
                    if (!cellIf) {test = "";
                                 } else {test = "<a href='" + cellIf + "' id='" + bill + "'><img src='" + testIcon + "'/></a> ";
                                         }
                    testimony += test;
                }
                console.log(testimony);

                var dataTemplate = document.createElement('tr');
                dataTemplate.className = action;
                var billElement = document.createElement('td');
                billElement.innerHTML = billLink;
                billElement.className = 'bill';
                var descripElement = document.createElement('td');
                descripElement.innerHTML = descrip;
                descripElement.className = 'description';
                var sectionElement = document.createElement('td');
                sectionElement.innerHTML = section;
                sectionElement.className = 'section';
                var actionElement = document.createElement('td');
                actionElement.innerHTML = action;
                actionElement.className = 'action';
                var testElement = document.createElement('td');
                testElement.innerHTML = testimony;
                testElement.className = 'testimony';

                dataTemplate.appendChild(billElement);
                dataTemplate.appendChild(descripElement);
                dataTemplate.appendChild(sectionElement);
                dataTemplate.appendChild(actionElement);
                dataTemplate.appendChild(testElement);
                
                document.getElementById('results_list').appendChild(dataTemplate);
            }
        }
        results_list.fadeIn();
    },

    addCommas: function (nStr) {
        "use strict";
        var x, x1, x2, rgx;
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    }

};
console.log("BillsLib Loaded");
