/*
Service in the org info.. most seem to have "*" to seperate services.. and then a <br> is put in the 211 listing.
Is this a standard? can we rely oin this?

DO I need a "zoom to button on the map -- see plowto"

Search -- split words and highlight??

add in aria tags,, and do better accessivbility...

2) why does loading dialog takes so long to show up when printing PDF?
3) do we limit topics.. doesn't seem to be working.. it doesn't work on optionGroups
4) Add a reset button to the filters?

*/
(function (window, undefined) {
   'use strict';

var TTCPlanner = 'http://www.ttc.ca/Trip_planner/index.jsp?EndDetail=';

//tremp: https://drive.google.com/open?id=0B-j2Y49nfiw2aHk0cHktOXktTTg
var topicUrl = "https://drive.google.com/uc?id=0B-j2Y49nfiw2MnBjWHBqcDR4eW8";  ///view?usp=sharing
//var searchJsonUrl = "https://drive.google.com/uc?id=0B-j2Y49nfiw2bjZqOGgtcmJZbGs";
var searchJsonUrl = "https://drive.google.com/uc?id=0B-j2Y49nfiw2MFJwZTZPM3Q2a00";
//temp https://drive.google.com/open?id=0B-j2Y49nfiw2MFJwZTZPM3Q2a00
var detailUrl = "https://drive.google.com/uc?id=";

var MAX_FAVS = 5;
var MAX_TOPICS = 13;
var MAX_LANGS = 5;
//var MAX_ETH = 5;
var MAX_PDF_ORGS = 200;
var LS_KEY_FAVS = "YouthServiceFavs";
//var TORONTO_CENTER = new google.maps.LatLng(43.69666,-79.39274);
var MAP_CENTER = new google.maps.LatLng(43.717954, -79.369173);

//var LAKE_ONTARIO_SPOT = new google.maps.LatLng(43.62514124,-79.23726082);

var NO_ORGS_TO_ADD = 10;

var initLoad = true;  // Use to avoid 'select all filter triggers on initial load'
var fidData = {};
var gblShowFavsOnlyInd = false;
var gblLastLoaded = 0;
var gblOrgSrchData = {};
var gblSearchData = [];
var gblFilteredData = [];
var gblLatLngData = {};
var gblMultiSelectTriggerOrig;
var gblCurrentTab = "";
var gblTopicMap = {};
var gblSelectedTopic = "";
var gblSelectedSubOptsCnt = 0;
var gblTopicTreeItems = [];
var map;
var detMap;
var oms;  //spidering of map
var favs = {};
var mapMarkers = {};
var changedMarkers = {};
var gblSelectedMarker = "";
var gblNoLatLngMarker = "";
var CommonInfoWindow = new google.maps.InfoWindow();
var markerImages = {};
var accImages = {};
//var tooltipText = {
//        "YAP001":  "Programs and services focused on the needs of youth in the First Nations, Inuit and Métis communities.",
//        "YAP009" : "Educational programs to help adults gain entry into post-secondary or apprenticeship programs, or to find employment.",
//        "YAP087" : "Youth-specific programs and services for those with physical and developmental disabilities. Includes health services and supports, legal and financial programs, employment and recreation services."
//};


/*- Utility Functions -------------------------------------------------------*/

function checkIEVersion() {
    var browser = navigator.userAgent;
    var IEversion = 99; //Give a default value for non-IE browsers
    if (browser.indexOf("MSIE") > 1) { IEversion = parseInt(browser.substr(browser.indexOf("MSIE")+5, 5));}
    return IEversion;
}
    
function showWaiting(opt, msg) {
    var waitLoader = $("#wait-loader");
    if (opt) {
        waitLoader.show();
        waitLoader.find("span").text(msg);
    } else {
        waitLoader.hide();
    }
}

function dynamicSort(root, property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }

    return function (a,b) {
        var result = 0;
        if (root !== "") {
            result = (a[root][property] < b[root][property]) ? -1 : (a[root][property] > b[root][property]) ? 1 : 0;
        } else {
            result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        }
        return result * sortOrder;
    };
}

function decodeMultiSelection(domId) {
    var str = "";
    if ($(domId).prop('options') &&  $(domId).prop('selectedOptions') && $(domId).prop('options').length === $(domId).prop('selectedOptions').length) {
        str = "ALL";
    } else if ($(domId).val() !== null) {
        $.each($(domId).val(), function(i,item) {
            str += (i>0) ? "," : "";
            str += item;
        });
    }
    return str;
}
function decodeMultiSelectionTexts(domId) {
    var str = "";
    if ($(domId).prop('options') &&  $(domId).prop('selectedOptions') && $(domId).prop('options').length === $(domId).prop('selectedOptions').length) {
        str = "ALL";
    } else if ($(domId).val() !== null) {
        $.each($(domId).prop('selectedOptions'), function(i,item) {
            str += (i>0) ? "," : "";
            str += item.label;
        });
    }
    return str;
}

function decodeTopics(tps) {
    var topicStr = "";
    if (objectPropertyHasValue(tps)) {
        $.each(tps.split(","), function(j, topic) {
            if (!gblTopicMap[topic]) { 
                console.log("Topic Not found:" + topic);}
            else {
                topicStr += gblTopicMap[topic].desc + ", ";
                }
            });

         topicStr = topicStr.slice(0, -2);
    }
    return topicStr;
}

function selectFilter(filterStr, itemStr) {
    if ( filterStr === 'ALL') return true;
    if (typeof itemStr === 'undefined') return false;

    var retbool = false;
    if ( filterStr.length > 0 && filterStr.toLowerCase().indexOf(itemStr.toLowerCase()) > -1) {
        retbool = true;
    }
    return retbool;
}

function multiSelectFilter(filterStr, itemStr, itemSep) {
    if ( filterStr === 'ALL') return true;
    if (typeof itemStr === 'undefined') return false;
    if (itemStr === '') return false;

    var itemArr  = itemStr.split(itemSep);
    var retbool = false;
    $.each(itemArr, function(i, item) {
        retbool = selectFilter(filterStr, item.trim());
        if (retbool === true) {
            return false;
        }
    });
    return retbool;
}

function highlightMapMarker(fid) {
    if (mapMarkers[fid]) {
        mapMarkers[fid].setIcon(markerImages.foundMarker);
        map.setZoom(15);
        switchToTab("tabMap");
        map.setCenter(mapMarkers[fid].getPosition());
    
        var tDiv = $('#tabToggle');
        tDiv.find('.btn').toggleClass('active');
        tDiv.find('.btn').toggleClass('btn-primary');
        tDiv.find('.btn').toggleClass('btn-default');
    }

    
}
function clearMarkers() {
    Object.keys(mapMarkers).forEach(function(key, idx, array) {
        mapMarkers[key].setVisible(false);
        //mapMarkers[key].setMap(null);
        //delete mapMarkers[key];        
    });
}

/* not all objects have all properties. We also don't care about those that are blank */
function objectPropertyHasValue(prop) {

    return !!(typeof prop !== 'undefined' && prop !== "");
}

function convertQueryStringToObj() {

    var obj = {};
    var qs = window.location.search;
    var parms = qs.substr(1).split('&');   // both work. 1st is more readable.split(/[\?|\&]+/);
    for (var i =0; i <parms.length; i++) {
        if (parms[i] !=="" ) {
            var p=parms[i].split('=');
            if (p.length != 2) continue;
            obj[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
    }
    return obj;
}

function convertObjToQueryString(obj) {

    var newQS = "";
    Object.keys(obj).forEach(function(key, idx, array) {
        newQS += (newQS === "" ? "?" : "&");
        newQS += key + "=" + obj[key];
    });
    return newQS;
}

/* parmeter will be a string, or an array of strings */
function removeQueryStringParm(parm, saveStateInd) {

    var parms = [];
    if (typeof parm === "string") {
        parms.push(parm);
    } else {
        parms = parm;
    }
    var qs = convertQueryStringToObj();
    $.each(parms, function(i, item) {
         delete qs[item];
    });
    
    var newqs  =  convertObjToQueryString(qs);
    if (saveStateInd) {
        var currURL = window.location.protocol + "//" + window.location.host + window.location.pathname +  newqs;
        if (history.pushState) {
            history.pushState({}, "ignored title", currURL);     
        }
    }

}



//Todo: problem with "Select ALL", then deselect one.. then have more than max --  maybe selecting when all are selected means remove all
//if you deselect one from all. the onChnage hits, then deselect all hits
function resetAllOptions(idTag) {
    if ( gblMultiSelectTriggerOrig === "") {

        //var dropdown = $(idTag).siblings('.multiselect-container');
        $(idTag + ' option').each(function() {
            var input = $('input[value="' + $(this).val() + '"]');
            input.prop('disabled', false);
            input.parent('li').addClass('disabled');
        });
    }
    gblMultiSelectTriggerOrig = "";

}

//Problem:  if ALL is selected, then deselect one.. then have more than max, so we unselect all.
//After we call onChange for one, all the select/disable causes the select all to trigger
function limitSelection(idTag, limit) {
    gblMultiSelectTriggerOrig = "onChange";
    var selectedOptions = $(idTag + ' option:selected');
    if ($(idTag + ' option').length === (selectedOptions.length + 1) ) {
            $(idTag).multiselect('deselectAll', false);  //This will cause "SelectAll" trigger
            resetAllOptions(idTag);
        return;
    }

    if (selectedOptions.length >= limit) {
        // Disable all other checkboxes.
        var nonSelectedOptions = $(idTag + ' option').filter(function() {
            return !$(this).is(':selected');
        });

        nonSelectedOptions.each(function() {
            var input = $('input[value="' + $(this).val() + '"]');
            input.prop('disabled', true);
            input.parent('li').addClass('disabled');
        });
    } else {
        // Enable all checkboxes.
        $(idTag + ' option').each(function() {
            var input = $('input[value="' + $(this).val() + '"]');
            input.prop('disabled', false);
            input.parent('li').addClass('disabled');
        });
    }
}
/* --------------------------------------------------------------*/

function toggleFB() {
    var fbIcon = $("#iconFB");
    var fb = $("#filterBlock");
  if (fb.css("display")=="none") {
      fb.css("display","block");fbIcon.removeClass("glyphicon-chevron-down").attr("title","expand");fbIcon.addClass("glyphicon-chevron-up").attr("title","collapse");
  } else  {
      fb.css("display","none");fbIcon.removeClass("glyphicon-chevron-up").attr("title","collapse");fbIcon.addClass("glyphicon-chevron-down").attr("title","expand" );
  } 
}

function getDetailLink(orgId, orgName) {
    var retStr;
     retStr = "<span class='orgLink'><a href='' data-id = '" + orgId + "'  >" +  orgName  + "</a><span>";
    return retStr;
    //href='' onclick='gotoDetailPage(\"" + orgId + "\");return false;'
}

function gotoDetailPage(orgId) {
    
    //var orgId = ele.attr("data-id");
    var qs = convertQueryStringToObj();
    qs.orgId = orgId;
    var newqs = convertObjToQueryString(qs);    
    var currURL = window.location.protocol + "//" + window.location.host + window.location.pathname +  newqs;
    if (history.pushState) {
        history.pushState({}, "ignored title", currURL);     
    }
     
    initDetails(orgId);
    $("#detailModal").modal('show');
    /* hide main section for print purposes */
    $("#mainSection").hide();
    
    //$("#detailSection").show();
}


function createInfoWindow(latLng, item) {

    CommonInfoWindow.close();
    var content = "";

    content += "<div class='content infoDiv'>";
    content += "<div class='row infoRow'><div class='col-md-9'>";

    content += "<div class='row infoRow'><div class='infoHeaderRow col-md-12'>" + getDetailLink(item.gid, item.nme) + "</div></div>" ;

    content += "<div class='row infoRow'><div class='col-md-12'>" + item.adr + "</div></div>" ;

    content += "<div class='row infoRow'><div class='col-md-12'>" + item.ph;
    if (item.web && item.web !== "") { content += (" | " + "<a target='_blank' href='http://" + item.web + "'>" + item.web + "</a>");}
    content += "</div></div>";
    content += "<div class='row infoRow'><div class='col-md-12'>&nbsp;</div></div>";
    
     if (objectPropertyHasValue(item.tps)) {
        var topics = decodeTopics(item.tps);
        content += "<div class='row infoRow'><div class='col-md-12'><span class='infoLabel'>Topics: </span>" + topics  + "</div></div>";
     }

    if (objectPropertyHasValue(item.ens)) {
        content += "<div class='row infoRow'><div class='col-md-12'><span class='infoLabel'>Eligibility: </span>" + item.ens.replace("*","<br>") + "</div></div>" ;
    } else {
        content += "<div class='row infoRow'><div class='col-md-12'><span class='infoLabel'>&nbsp;</span></div></div>" ;
    }
    content += "</div>";
    content += "<div class='col-md-3'>";
    content += "<div class='row'><div class='col-md-12'>";
    if (favs[item.fid]) {
        content += getFavElement(item.fid, "infw", true);
    } else {
        content += getFavElement(item.fid, "infw", false);
    }
    content += "</div></div>";
    content += "<div class='row'><div class='col-md-12'>&nbsp;</div></div>";
    if (accImages[item.acc]) {
        content += "<div class='row'>";
        content += "<div class='col-md-12'><img src='" + accImages[item.acc].img + "' title='" + accImages[item.acc].title + "' alt='" + accImages[item.acc].title + "'/></div>";
        content += "</div>";
    }

    content += "</div>";

    content += "</div>"; // end row
    content += "</div>";


    //var width = $("#maincontent" ).width();
    CommonInfoWindow.setOptions(
        {   "position": latLng,
            //"maxWidth" : width / 2,
            //"pixelOffset":new google.maps.Size(-8, 60),
            "content": content});


    CommonInfoWindow.open(map);
    //some infowindows are wrapping.. setting maxwidth is good and this.
    //$("#maincontent .gm-style-iw .infoDiv").width( width / 2);
}

function getOrganizationData(orgId) {

   // console.log("getOrg" + orgId);
   //Todo : should be going this.. but with no promise, code breaks when expecting it..
   //if (fidData[orgId]) { return request; }
    var request = null;

   
    var url = detailUrl  + orgId;
    (function (orgId) {
       request = $.ajax({
        type: 'GET',
        url: url,
        crossDomain: true,
        jsonpCallback: 'odetCallBack',
        dataType: 'jsonp',
        success: function (data) {
            fidData[orgId] = data;
            console.log("getOrgfinished" + orgId);
        },
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
        }
    });
    })(orgId);
    return request;

}


function processInfoWindow(ele) {
    createInfoWindow(ele.position, gblOrgSrchData[ele.orgId]);

}
/*
function plotNoLatLng(cnt) {
    
    if (gblNoLatLngMarker) {
        gblNoLatLngMarker.setMap(null);
    }
    gblNoLatLngMarker = new MarkerWithLabel({
       position: LAKE_ONTARIO_SPOT,
       draggable: true,
       raiseOnDrag: true,
       clickable: false,
       cursor: 'none',
       map: map,
       icon: markerImages.nolatlng,
       labelContent: cnt + " organization(s) without known location",
       labelAnchor: new google.maps.Point(100, 0),
       labelClass: "mapMarkerlabels", // the CSS class for the label
       labelStyle: {opacity: 0.75}
     });    
 
}
*/
/* used to plot markers and change icons when favs change 
   Markers will only be created once. (depends on )
*/
function plotOrgMarker(org) {
    var img = "";
    var zidx = 100;
    var ll = org.lat + org.lng; 
    if (gblLatLngData[ll] > 1 ) {
        img = markerImages.multi;
        zidx = 200;
    } else {
        img = markerImages.single;
        zidx = 10;
    }
    if (favs[org.fid]) {
        img = markerImages.fav;
        zidx = 300;
    }
    var latlng;
    if (mapMarkers[org.fid]) {
        mapMarkers[org.fid].setIcon(img);
        mapMarkers[org.fid].setZIndex(zidx);
    } else {
        latlng =  new google.maps.LatLng(org.lat, org.lng );
            var marker = new google.maps.Marker({
                position: latlng,
                map: map,
                orgId: org.fid,
                icon: img,
                zIndex: zidx,
                title: org.nme
            });

           // marker.addListener('click', function () {
           //     processInfoWindow( this);
           // });

            mapMarkers[org.fid] =  marker;
            oms.addMarker(marker);
    }
    mapMarkers[org.fid].setVisible(true);
    return latlng;
}


function plotMarkers() {
    clearMarkers();
    var noLatLngCnt = 0;
    //var bounds = new google.maps.LatLngBounds();
    $.each(gblFilteredData, function(i, item) {
        if (objectPropertyHasValue(item.lat) &&
            objectPropertyHasValue(item.lng)) {
            var latlng = plotOrgMarker(item);
            //bounds.extend(latlng);
        } else {
            noLatLngCnt++;
        }
    });
    if (noLatLngCnt > 0) {
        $("#noLatLngTotal").text(noLatLngCnt);
        $(".noLatLngTotal").show();
        //plotNoLatLng(noLatLngCnt);
    } else {
        $(".noLatLngTotal").hide();
    }
}



/* if you select an optiongroup, it is not selected in the multiselect*/
function recheckTopicFilter() {
    //alert('recheck_start' );
    var tMap = {};
    var tf = $("#topicFilter");
    var selOpts = tf.prop('selectedOptions');
    Object.keys(gblTopicMap).forEach(function(topicId, idx, array) {
        var opts = gblTopicMap[topicId].options > 0 ? gblTopicMap[topicId].options : 1;
        tMap[topicId] = {totalOptions : opts, cnt : 0, parent : gblTopicMap[topicId].parent};
    });
    if (selOpts.length > 0) {
        $.each(tf.val(), function(i,item) {
            var topic = gblTopicMap[item];
            if (objectPropertyHasValue(topic.parent)) {
                topic = gblTopicMap[topic.parent];
                if (objectPropertyHasValue(topic.parent)) {
                    topic =  gblTopicMap[topic.parent];
                }
                
            }
            tMap[topic.topicId].cnt += 1;
        });
    }
     Object.keys(tMap).forEach(function(topicId, idx, array) {
         var chk = $("input[type=checkbox][value=" + topicId +']');
         if (tMap[topicId].parent === "") {
            if (tMap[topicId].cnt === tMap[topicId].totalOptions) {
                chk.first().prop('checked', true);
                chk.first().closest("li").addClass("active");
             //console.log(topicId + " should be on");
            } else {
                chk.first().prop('checked', false);
                chk.first().closest("li").removeClass("active");
             //console.log(topicId + " should be off");
            }
         }
     });
}
/* rob didn't put values on an optgroup but I'm going to
   rob doesn't have empty optgroups.
  if you select an optionGroup, you get a selection for each suboption.  The optiongroup itself is not consider checked.
   -- so we need to check all children and it all are checked.. then parent is checked by definition
  We fudge the data from AJAX because of the onchange logic, we want "options" property to only occurs on the top elements (ie. those without parents)
  and remember we don't do any 2nd to 3rd levels optgroup selections
  
*/
function addTopicOptions(data) {
    var topicData = data.sort(dynamicSort("","sortOrder"));
 
    var items = [];
    var newItem = {};
    newItem.text = "Select All";
    newItem.topicId = "Select All";
    items.push(newItem);
    var topicFilter = $( "#topicFilter" );
    $.each(topicData, function(i,item) {

        var newItem = {};
        //var addClass ="";
        /* ignore all items that are not parents.. we will clean the ETL so we only have parents */
        if (item.parent === "") {
            newItem.text = item.desc;
            newItem.topicId = item.topicId;
            newItem.tooltip = item.tooltip;
            newItem.showSearchInput = false;
            topicFilter.append( '<optgroup label="' +  item.desc + '"   value="' + item.topicId + '"></optgroup>' );
            
            if  (objectPropertyHasValue(item.children)) {
                newItem.nodes = [];
                
                //newItem.submenu.items = [];
                for (var j = 0; j < item.children.length; j++) {
                    
                    var subItem = item.children[j];
                    if (subItem.parent !== "") {
                        item.children[j].options = 0;
                    }
                    var newSubItem = {};
                    newSubItem.text = subItem.desc;
                    newSubItem.topicId = subItem.topicId;      
                    newSubItem.tooltip = subItem.tooltip;
                    topicFilter.append( '<option  selected="selected" value="' + subItem.topicId + '">' + subItem.desc + '</option>' );
                    /* for our purposes, we will only do 2 levels - 3 level, all options should be 0*/
                    
                    if  (objectPropertyHasValue(subItem.children)) {
                        //newSubItem.submenu = {};
                        newSubItem.nodes = [];
                        for (var k = 0; k < subItem.children.length; k++) {
                            var subSubItem = subItem.children[k];
                            var newSubSubItem = {};
                            newSubSubItem.text = subSubItem.desc;
                            newSubSubItem.topicId = subSubItem.topicId;
                            newSubSubItem.tooltip = subSubItem.tooltip;
                            newSubItem.nodes.push(newSubSubItem);
                            topicFilter.append( '<option selected="selected" value="' + subSubItem.topicId + '">' + "&nbsp;&nbsp;&nbsp;&nbsp;" + subSubItem.desc + '</option>' );
                        }
                        
                    }                   
                    newItem.nodes.push(newSubItem);

                }
            } else {
                topicFilter.append( '<option  selected="selected" class="optGroupOption" value="' + item.topicId + '">' + item.desc + '</option>' );
            }
            
            items.push(newItem);
        }
    /* suboption will appear as children under parents, buit also repeated as themselves for quick access in the hash*/
    if (item.parent !== "") {
       item.options = 0;
    }
     if (item.parent === "" && item.options === 0) {
        item.options = 1; // We faked an option for it above.
     }
    gblTopicMap[item.topicId] = item;
    });
    gblTopicTreeItems = items;
    
    /* gblSelectedTopic should be selected before hitting onchange */
    topicFilter.multiselect({includeSelectAllOption: true,
            numberDisplayed:1, 
            enableClickableOptGroups: true, 
            enableCollapsibleOptGroups: true,
            onChange: function(option, checked, select) {
                var currentTopic = gblTopicMap[option.val()];
                gblSelectedSubOptsCnt++;            
                /* Want to update the page on ther last option, pushstate is accurate */
                if (gblSelectedTopic === "" || (gblSelectedSubOptsCnt === gblSelectedTopic.options)) {
                    //--TODO limitSelection("#topicFilter", MAX_TOPICS);//TODO?????
                    updatePage();   
                    gblSelectedTopic = "";
                    saveURLState();
                }
            },
            onSelectAll: function() {
                //resetAllOptions("#topicFilter");
                console.log("select All triggered");
                if (!initLoad) {
                    updatePage();
                }
            }
    });
    
    /* lets trap optiongroup selects*/
     $('.multiselect-container li a').on("click", function () {
        if ($(this).children().val() !== "") {
            //alert("option group" + $(this).children().val());
            gblSelectedTopic = gblTopicMap[$(this).children().val()];
            gblSelectedSubOptsCnt = 0;
        }
     });
    
    if ( objectPropertyHasValue(window.$.QueryString.topic)) {
        var sels = window.$.QueryString.topic.split(",");

        topicFilter.val(sels);
        topicFilter.multiselect("refresh");
    }

    //TODO:  Fix this for the one we want!!!!!
    $('.multiselect-container li').not('.filter, .group').tooltip({
        placement: 'left',
        container: 'body',
        title: function () {
            // put whatever you want here
            var value = $(this).find('input').val();
            if (value && value.indexOf('all') === -1) {
                if(gblTopicMap[value] && gblTopicMap[value].tooltip) {
                    return value + " - " + gblTopicMap[value].tooltip;
                } 
            } else {
                return ''; //Has Value of ' + value;
            }
        }
    });

    /* remove drodown caret from our selection which have no real dropdowns */
    $.each(gblTopicTreeItems, function(i,node) {
        if (typeof node.nodes === 'undefined') {
            $('input[type=checkbox][value="' + node.topicId + '"').first().next().children().last().removeClass("caret");
        }
    });
    
}

/* TODO: it is not async.. figure this comment and remove it. this is sync because we use it in filtering and we needed fully initialized */
function loadTopics() {

    $.support.cors = true;
    $.ajax({
        type: 'GET',
        url: topicUrl,
        //async: false,
        //jsonp: false,
        jsonpCallback: 'TopxCallBack',
        contentType: "application/json",
        dataType: 'jsonp',
        success: function (data) {
            addTopicOptions(data);
        },
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
        }
    });
}

function setUpSearchFilters() {

    loadTopics();
    var sels;
    /*
    $("#ecFilter").multiselect({
        includeSelectAllOption: true,
        numberDisplayed: 1,
        onChange: function(option, checked, select) {
            limitSelection("#ecFilter", MAX_ETH);
            updatePage();
        },
        onSelectAll: function() {
            resetAllOptions("#ecFilter");
            if (!initLoad) {
                updatePage();
            }
        }
    });

    if (objectPropertyHasValue(window.$.QueryString.ecs)) {
        sels = window.$.QueryString.ecs.split(",");
        $("select#ecFilter").val(sels);
        $("select#ecFilter").multiselect("refresh");
    }
    */


 
    $("#langFilter").multiselect({
        includeSelectAllOption: true,
        onChange: function(option, checked, select) {
            limitSelection("#langFilter", MAX_LANGS);
            updatePage();
        },
        onSelectAll: function() {
           resetAllOptions("#langFilter");
            if (!initLoad) {
                updatePage();
            }
        }
    });
    if (objectPropertyHasValue(window.$.QueryString.lang)) {
        sels = window.$.QueryString.lang.split(",");
        $("select#langFilter").val(sels);
        $("select#langFilter").multiselect("refresh");
    }

    $("#accFilter").multiselect({
        includeSelectAllOption: true,
        onChange: function(option, checked, select) {
            updatePage();
        },
        onSelectAll: function() {
            if (!initLoad) {
                updatePage();
        }}
    });
    if (objectPropertyHasValue(window.$.QueryString.accs)) {
        sels = window.$.QueryString.accs.split(",");
        $("select#accFilter").val(sels);
        $("select#accFilter").multiselect("refresh");
    }



    if (objectPropertyHasValue(window.$.QueryString.favs)) {
         var favArray = window.$.QueryString.favs.split(",");
         $.each(favArray, function(i, item) {
             favs[+item] = true;
         });
    } else  {
        getFavourites();
    }

    if (objectPropertyHasValue(window.$.QueryString.srchstr)) {
        $("#searchString").val(window.$.QueryString.srchstr);
    }
 
}

function switchToTab(tab) {
    gblCurrentTab = tab;
    if (tab === "tabMap") {
        $("#ysMap").show();
        $("#tabMap").parent().addClass('active');
        $("#ysListing").hide();
        $("#tabList").parent().removeClass('active');
    } else {
        $("#ysMap").hide();
        $("#tabMap").parent().removeClass('active');
        $("#ysListing").show();
        $("#tabList").parent().addClass('active');
        var z =  map.getZoom(); //force a redraw
        map.setZoom(z);
    }
}

function getFavElement(fid, loc,removeInd) {

    var str = '<div data-id="' + fid + '" data-loc="' + loc + '"';
    if (removeInd) {
         str += ' class="btn btn-sm addtofavs rem-fav" title="Remove from favourites"><span aria-hidden="true" class="glyphicon glyphicon-star"></span> Remove</div>';
    } else {
         str += ' class="btn btn-sm addtofavs" title="Add to favourites"><span aria-hidden="true" class="glyphicon glyphicon-star"></span> Add</div>';

    }
    return str;
}
function toggleFavs(ele) {
    var listimgele = $( "#ysListing [data-fid='" + fid + "']" );
    var fid = ele.attr("data-id");
    var loc = ele.attr("data-loc");
    if (ele.hasClass("rem-fav")) {
        ele.removeClass("rem-fav");
        ele.attr("title", "Add to favourites");
        delete favs[fid];
        ele.html('<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Add');

         if (!$.isEmptyObject(listimgele)) {
            listimgele.prop("src", markerImages.single);
         }
            
    } else {
        if (Object.keys(favs).length >= MAX_FAVS)
            return bootbox.alert("You may only add up to " + MAX_FAVS + " favourite locations.");
        favs[fid] = true;
        ele.addClass("rem-fav");
         ele.attr("title", "Remove from favourites");
         ele.html('<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Remove');
         if (!$.isEmptyObject(listimgele)) {
             listimgele.prop("src", markerImages.fav);
         }
    }
    plotOrgMarker(gblOrgSrchData[fid]);
    /* if in an infowindo, update listing */
     if (loc === "infw") {
         if (!$.isEmptyObject(listimgele)) {
            toggleFavs(listele);
         }
     }
     saveFavourites();
     saveURLState();
}
function setUpEvents() {

    $("#searchBtn").on("click", function() {
        updatePage();
    });
    
 
    $("#searchString").on("keypress", function(e) {
        var KeyCode = e.which || e.keyCode || 0;
        if (KeyCode === 13 || KeyCode === 9) {
            updatePage();
        }
    });


    $(".hasclear").keyup(function () {
        var t = $(this);
        t.next('span').toggle(Boolean(t.val()));
    });
    $(".clearer").hide($(this).prev('input').val());

    $(".clearer").click(function () {
        $(this).prev('input').val('').focus();
        $(this).hide();
        updatePage();
    });
/*
    $(".hasclear").on("keyup", function () {
        var t = $(this);
        t.next('span').toggle(Boolean(t.val()));
    });
    $(".clearer").on("hide", function() {$(this).prev('input').val()});

    $(".clearer").on("click", function () {
        $(this).prev('input').val('').focus();
        $(this).hide();
        updatePage();
    });
*/

    $("#maincontent").on("click", "div.addtofavs",function() {
        toggleFavs($(this));
    });

   $("#toggleShowFavs").on("click",function() {
        CommonInfoWindow.close();
        gblShowFavsOnlyInd = !gblShowFavsOnlyInd;
        updatePage();
        if ($(this).html().indexOf('Favourites') > -1) {
            $(this).html('<span class="glyphicon glyphicon-ok" aria-hidden="true"></span>&nbsp;&nbsp;Show All Locations');
        } else {
            $(this).html('<span class="glyphicon glyphicon-star" aria-hidden="true"></span>&nbsp;&nbsp;Show Only Favourites');
        }
    });
    
    
   $("#filterBlockToggle").on("click",function() {
       toggleFB();
    });
   
    $("#pdfbtn").on("click",function() {
        if (checkIEVersion() < 11) {
            bootbox.alert("Your browser does not support this feature.");
         } else {        
            generatePDF();
       }
    });

    
    $(".detailClose").on("click", function() {
        removeQueryStringParm("orgId", true);
        saveURLState();
        if (gblSearchData.length === 0) {
            initApp("detail");
        }
        $("#mainSection").show();
        $("#detailModal").modal('hide');
        //var z =  map.getZoom(); //force a redraw
        //map.setZoom(z);
        return false; //very important.
    });
    
    $("#maincontent").on("click","span.orgLink a", function() {
       gotoDetailPage($(this).attr("data-id"));
       return false;
    });
    
    $("#maincontent").on("click",".listingMarker", function() {
        highlightMapMarker($(this).attr("data-fid"));
    });
 
    
    $("#BackTo").on("click",function() {
        removeQueryStringParm("orgId", true);
        saveURLState();
        $("#detailSection").hide();
        $("#mainSection").show();
        if (gblSearchData.length === 0) {
            initApp("detail");
        }
    });
    
    
    $('.btn-toggle').on("click", function() {

        $(this).find('.btn').toggleClass('active');  
    
        if ($(this).find('.btn-primary').size()>0) {
            $(this).find('.btn').toggleClass('btn-primary');
        }
        if ($(this).find('.btn-danger').size()>0) {
            $(this).find('.btn').toggleClass('btn-danger');
        }
        if ($(this).find('.btn-success').size()>0) {
            $(this).find('.btn').toggleClass('btn-success');
        }
        if ($(this).find('.btn-info').size()>0) {
            $(this).find('.btn').toggleClass('btn-info');
        }
    
        $(this).find('.btn').toggleClass('btn-default');
        switchToTab($(this).find('.btn.active').prop("id"));
       
    }); 
    
    $( window ).scroll(function() {
        if (gblCurrentTab !== "tabList") return;
        var wrap = document.getElementById('wrap');
        var contentHeight = wrap.offsetHeight;
        var yOffset = window.pageYOffset; 
        var y = yOffset + window.innerHeight;
        if(y >= contentHeight && gblLastLoaded < gblFilteredData.length ){
            showListing();
        }
       // var status = document.getElementById('status');
       // status.innerHTML = contentHeight+" | "+y;
    });   
}


function resetMap() {
    map.setZoom(11);
    map.setCenter(MAP_CENTER);
    CommonInfoWindow.close();
    if (gblSelectedMarker) {
        gblSelectedMarker.setMap(null);
    }
}

/* note: the marker here has been spidified and the position adjusted */
function createSelectedMarker(marker) {
    if (gblSelectedMarker !== "") {
        gblSelectedMarker.setMap(null);
    }
    gblSelectedMarker = new google.maps.Marker({
                position: marker.getPosition(),
                map: map,
                orgId: marker.orgId,
                icon: {
                    url: markerImages.selected,
                    //size: new google.maps.Size(72, 72),
                    //origin: new google.maps.Point(0, 0),
                    //anchor: new google.maps.Point(18, 18),
                    scaledSize: new google.maps.Size(60, 60)
                },
                zIndex: 0,
                title: marker.title
            });
}
function initMap() {

    $("#img_multi").attr("src", markerImages.multi);
    $("#img_single").attr("src", markerImages.single);
    $("#img_fav").attr("src", markerImages.fav);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
        center: MAP_CENTER,
        zoom: 11,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,position: google.maps.ControlPosition.TOP_RIGHT},
        zoomControl: true
    });

    var resetBTN = document.getElementById('resetMap');
    resetBTN.onclick = function () { resetMap();};
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(resetBTN);
    oms = new OverlappingMarkerSpiderfier(map, {keepSpiderfied : true,legWeight : 3,markersWontMove : true, markersWontHide : true,nearbyDistance  :1});
    //google.maps.event.addListener(map, 'tilesloaded', function(evt) {
    //  $("#resetMap").css( {"right" : "8px", "top": "0px"});
    //});
    var input = document.getElementById('map-input');
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
          searchBox.setBounds(map.getBounds());
    });

    var markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();

        if (places.length === 0) {
            return;
        }

        // Clear out the old markers.
        markers.forEach(function(marker) {
            marker.setMap(null);
        });
        markers = [];

        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {
            var icon = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25)
            };

            // Create a marker for each place.
            markers.push(new google.maps.Marker({
                map: map,
                icon: icon,
                title: place.name,
                position: place.geometry.location
            }));

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
    
    map.fitBounds(bounds);
    map.setZoom(14);
    });
        
        
    oms.addListener('click', function(marker, event) { 
        processInfoWindow( marker);
        //if (gblSelectedMarker.getMap() !== null) {
          if (gblSelectedMarker) {
            gblSelectedMarker.setMap(null);
            }
        //    gblSelectedMarker.marker.setIcon(gblSelectedMarker.initIcon);
        //    gblSelectedMarker = "";
        //}
        //gblSelectedMarker = marker;
        // marker.setIcon(markerImages.selected)
    }); 
    
    /* here all the markers have been offset by OMS. and even if we really do nothing but zoom, we will then go to the unspiderfy event. */
    oms.addListener('spiderfy', function(markers) {
       // alert(markers.length);
        if (markers.length > 1 && map.getZoom() < 14) { //This gets to a level of one lat/lng for the most part.
        
            createSelectedMarker(markers[0]);
            
            //if (gblSelectedMarker === "") {
            //    gblSelectedMarker = "";
            //    gblSelectedMarker = {marker : markers[0], initIcon : markers[0].getIcon(), zIndex : markers[0].getZIndex()};
            //    markers[0].setIcon(markerImages.selected)
            //    markers[0].setZIndex(0);
           // }
            map.setCenter( markers[0].getPosition() );
            map.setZoom( map.getZoom() + 2 ); // this zoom will invoke the unspiderfy event
            return false;
        } else {
            for (var i = 0; i < markers.length; i++) {
                changedMarkers = [];
               // markers[i].setZIndex(288000005);
                if ( markers[i].getIcon() === markerImages.multi || markers[i].getIcon() === markerImages.selected) {
                    markers[i].setIcon(markerImages.single);
                    changedMarkers.push(markers[i]);
                }
            }
        }
    });
    
    /* the markers in the unspidefy events has the original positions */
    oms.addListener('unspiderfy', function(markers) {
        if (gblSelectedMarker.getMap() !== null) {
            gblSelectedMarker.setPosition(markers[0].getPosition());
        }
        for (var i = 0; i < markers.length; i++) {
           // markers[i].setZIndex(markers[i].zIndex);
            for (var j = 0; j < changedMarkers.length; j++) {
                changedMarkers[j].setIcon(markerImages.multi);
            }
            if (changedMarkers.length > 0) {
                gblSelectedMarker.setMap(null);
                //gblSelectedMarker.marker.setIcon(gblSelectedMarker.initIcon);
                changedMarkers = [];
                //gblSelectedMarker = "";
            }
            //console.log("unspidefy");
        }
    });

    //TODO: does this go into too deep.. should it even be here

    if(navigator.geolocation) {
        //var browserSupportFlag = true;
        navigator.geolocation.getCurrentPosition(function(position) {
            var initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
            map.setCenter(initialLocation);
            map.setZoom(11);
            }, function() {
                //handleNoGeolocation(browserSupportFlag);
        });
    }
}

//TODO: add in other filters
function getFilterState(qs) {

    //var topics = decodeTreeView($("#topicTreeView"), 'topicId');
    var topics = decodeMultiSelection($("#topicFilter"));
    var langs = decodeMultiSelection($("#langFilter"));
    //var ecs = decodeMultiSelection($("#ecFilter"));
    var accs = decodeMultiSelection($("#accFilter"));
    var searchStr = $("#searchString").val();
    if (searchStr !== "") {
        qs.srchstr = searchStr;
    } else {
        delete qs.srchstr;
    }
    if (topics !== "ALL") {
        qs.topic = topics;
    } else {
        delete qs.topic;
    }
    if (langs !== "ALL") {
        qs.lang = langs;
    } else {
        delete qs.lang;
    }
    //if (ecs !== "ALL") {
    //    qs.ecs = ecs;
    //} else {
    //    delete qs.ecs;
    //}
    if (accs !== "ALL") {
        qs.accs = accs;
    } else {
        delete qs.accs;
    }
    var favArr = [];
    Object.keys(favs).forEach(function(key, idx, array) {
        favArr.push(key);
    });

    if (favArr.length > 0) {
        qs.favs = favArr.join(",");
    } else {
        delete qs.favs;
    }
    return qs;
}
function saveURLState() {
    var qs = convertQueryStringToObj();
    qs = getFilterState(qs);
    var newqs = convertObjToQueryString(qs);
    var currURL = window.location.protocol + "//" + window.location.host + window.location.pathname +  newqs;
    if (history.pushState) {
        history.pushState({}, "ignored title", currURL);
    }
}

function saveFavourites() {
    if (typeof(Storage) !== "undefined") {
        localStorage.setItem(LS_KEY_FAVS,  JSON.stringify(favs));
    }
}

function getFavourites() {
    if  (typeof(Storage) !== "undefined") {
        var ls_favs = localStorage.getItem(LS_KEY_FAVS);
        if (ls_favs) {
         try{
            favs = JSON.parse(ls_favs);
            }catch(e){
                //ignore error
            }
        }
    }
}

function filterData() {
    gblFilteredData = [];
    gblLatLngData = {};
    //var selectedTopics = decodeTreeView($("#topicTreeView"), 'topicId');
    var selectedTopics = decodeMultiSelection($("#topicFilter"));
    var selectedAccs = decodeMultiSelection($("#accFilter"));
    var selectedLangs = decodeMultiSelection($("#langFilter"));
    $.each(gblSearchData, function(i, item) {

        var showItem = true;

        if (gblShowFavsOnlyInd) {

            showItem = favs[item.fid];
        } else {
            if (showItem) showItem = multiSelectFilter(selectedTopics,item.tps,",");
            if (showItem) showItem = selectFilter(selectedAccs,item.acc);
            if (showItem) showItem = multiSelectFilter(selectedLangs,item.sls,";");
            if (showItem) {

                if (JSON.stringify(item).toLowerCase().indexOf($("#searchString").val().toLowerCase()) === -1) {
                    showItem = false;
                }
            }
        }
        if (showItem) {
            gblFilteredData.push(item);
            var latlng = item.lat + item.lng;
            if (!gblLatLngData[latlng]) {
                gblLatLngData[latlng] = 1;
            }else {
                gblLatLngData[latlng] += 1;
            }
        }
    });
    $("#countTotal").text(gblFilteredData.length);
}
function updatePage() {
    
    if (gblNoLatLngMarker) gblNoLatLngMarker.setMap(null);
    filterData();

    plotMarkers();
    $("#ysListing").html("").trigger('update');
    gblLastLoaded = 0;
    showListing();
    $("#loader").hide();
    saveURLState();
    initLoad = false;
    setTimeout(recheckTopicFilter, 500);
    //setTimeout($("#topicFilter").multiselect("refresh"), 200);//$("#topicFilter").multiselect("refresh");
    console.log("init over");
}

function loadDataCallBack(data) {
    gblSearchData = data.sort(dynamicSort("","nme"));
    $.each(gblSearchData, function(i, org) {
        gblOrgSrchData[org.fid] = org;
        
        
    });
    //Object.keys(latData).forEach(function(key, idx, array) {
    //  if (latData[key] > 1 ) {
    //      console.log(key + " " + latData[key]);
    //      }
    //});
    updatePage();
    showWaiting(false);
}


function loadData() {
    $("#loader").show();
    $.support.cors = true; //you don't enable CORS by setting that variable. You just tell jQuery that you're in an environment where Cross-Domain XHR requests are possibl
    var browser = navigator.userAgent;
    var IEversion = 99; //Give a default value for non-IE browsers
    if (browser.indexOf("MSIE") > 1) { IEversion = parseInt(browser.substr(browser.indexOf("MSIE")+5, 5));}
        $.ajax({
            type: 'GET',
            url: searchJsonUrl,
            jsonpCallback: 'srchCallBack',
            contentType: "application/json",
            dataType: 'jsonp',
            success: function (data) {
                loadDataCallBack (data);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status);
                console.log(thrownError);
            }
        });

}

function showListing() {
    var strRows = "";
    var endCnt = gblLastLoaded + NO_ORGS_TO_ADD;
    $.each(gblFilteredData, function(i, item) {

        //console.log( "I" + i + " last:" + gblLastLoaded + " end:" + endCnt);
        if (i < gblLastLoaded) { return; }
        
        if (gblLastLoaded > endCnt) {return false;  }
        if (gblLastLoaded === 0) {
            strRows += "<div id='ys__1' class='ystablerow'>&nbsp;</div>";
        }
        
        gblLastLoaded++;
        var markerImg = (favs[item.fid]) ? markerImages.fav : markerImages.listingMarker;
        var markerIconSpan = "";
        if (objectPropertyHasValue(item.lat)) {
            markerIconSpan = "<span> <img data-fid='" + item.fid + "' class='listingMarker' src='" + markerImg + "'>" + "</img><span>";
        }
        strRows += "<div id='ys_" + i + "' class='ystablerow'>";
        strRows += "<div class='row'><div class='col-xs-10 col-sm-10 col-md-10'>";
        strRows += "<div class='row'><div class='col-md-12'>" + getDetailLink(item.gid, item.nme) + markerIconSpan + "</div></div>";
        if (objectPropertyHasValue(item.adr)) {
            strRows += "<div class='row'><div class='col-md-12'>" + item.adr +"</div></div>";
        }
        
        if ( objectPropertyHasValue(item.ph) || objectPropertyHasValue(item.web)) {
            strRows += "<div class='row'><div class='col-md-12'>";
            var phoneLine = "";
            if (objectPropertyHasValue(item.ph)) {
                phoneLine = item.ph;
            }
            if (objectPropertyHasValue(item.web)) { 
                phoneLine += (phoneLine !== "") ? " | " : "";
                phoneLine += "<a target='_blank' href='http://" + item.web + "'>" + item.web + "</a>";
            }
            strRows += phoneLine + "</div></div>";
        }
        
         strRows += "<div class='row'><div class='col-xs-10 col-sm-10 col-md-10'>&nbsp;</div></div>";
         var topics = decodeTopics(item.tps);
        //var topics = ;
        if (topics !== "") {
            strRows += "<div class='row'><div class='col-md-12'><span class='detailLabel'>Topic: </span>" + topics + "</div></div>";
        }

        if (typeof item.ens  !== "undefined") {
            strRows += "<div class='row'><div class='col-md-10'><span class='detailLabel'>Eligibility: </span>" +item.ens + "</div></div>";
        }
        
        /*
        if (typeof item.acc  !== "undefined" ) {
            strRows += "<div class='row'><div class='col-md-10'>Accessibility:" +item.acc + " -will be icon</div></div>";
        }
        */
        if (typeof item.sls  !== "undefined" ) {
            strRows += "<div class='row'><div class='col-md-10'><span class='detailLabel'>Languages: </span>" +item.sls + "</div></div>";
        }
        strRows += "</div>";
        strRows += "<div class='col-xs-2 col-sm-2 col-md-2'>" ;
            strRows += "<div class='row'><div class='col-md-12'>";
            if (favs[item.fid])  {
                strRows += getFavElement(item.fid, "list", true);
            } else {
                strRows += getFavElement(item.fid, "list", false);
            }
            strRows += "</div></div>";
            strRows += "<div class='row'><div class='col-md-12'>&nbsp;</div></div>"; //Empty Row for spacing
            strRows += "<div class='row'><div class='col-md-12'>";
            if (accImages[item.acc]) {
                strRows += "<img src='" + accImages[item.acc].img + "' title='" + accImages[item.acc].title + "' alt='" + accImages[item.acc].title + "'/>";
            }
            strRows += "</div></div>";
        strRows += "</div>";
        strRows += "</div>";

        strRows += "</div>";
    });
    if (gblLastLoaded === 0) {
       strRows += "<div id=ynowRows class='ystablerow'>No Rows Selected</div>"; 
    }
    $("#ysListing").append(strRows);
    //$("#ysListing").html(strRows).trigger('update');

}

function initApp(loc) {

    showWaiting(true);
    var qsOrgId = window.$.QueryString.orgId;
    if (typeof  qsOrgId === 'undefined' || loc === "detail")  {
        if (gblSearchData.length === 0) {
            setUpSearchFilters();
            initMap();
            loadData();
        }
    } else {
        gotoDetailPage(qsOrgId);        
    }

}

/* --------- pdf generation -----*/

function pdfCB() {
        showWaiting(false);    
}
function generatePDF() {

 
    if (gblFilteredData.length > MAX_PDF_ORGS) {
        bootbox.alert( {size: 'small', message : "Please limit the number of organizations to report to no more than " + MAX_PDF_ORGS + " by using the filters and/or the favourites functionality."});
        return;
    }
    if (gblFilteredData.length === 0) {
        bootbox.alert( {size: 'small', message : "Please ensure some organizations are shown before producing a pdf."});
        return;
    }

    showWaiting(true, "Generating PDF. Please be patient.");

    var dt = new Date();
    var dd = {};
    dd.pageSize = 'LETTER';
    dd.footer = function(currentPage, pageCount) { return {columns: [{image : 'two11', width: 80, margin: [10,15,0,10]}, {text: 'This information comes from www.211Ontario.ca, a project of Findhelp Information Services.', width: 400, margin: [20,20,0,10], style: 'footertext'}, {text: currentPage.toString() + ' of ' + pageCount, alignment: 'right', style: 'footertext', margin: 15 }] }; };
    dd.header = {columns: [ {image: 'logo', width: 80, margin: [0,20,0,10]}, {text: 'Youth Services', margin: [0,20,20,10], style: 'headertext'} ] };
    dd.pageMargins = [20, 70, 20, 60];
    dd.styles = {};
    dd.styles.listingtitle = {fontSize: 16,bold: true, alignment: 'left', color: "#000000", margin: [0,0,0,10], pageBreak: 'before'};
    dd.styles.orgListing = {margin: [0,5,20,2], fontSize: 12};


    dd.styles.orgRows = {margin: [0,0,0,15]};
    dd.styles.headertext = {fontSize: 12, color: "#aaa", alignment: "right", width: '50%'};
    dd.styles.sctableheader = {fontSize: 8, color: "#000", alignment: "center", fillColor: '#eeeeee'};
    dd.styles.footertext = {color: "#aaa", fontSize: 8};
    dd.styles.tableheader = {fontSize: 10, bold: true, fillColor: '#eeeeee'};

    dd.styles.tblcol = {margin: [0,0,0,2],fontSize: 8};
    dd.styles.tblcol1 = {margin: [0,0,20,2], fontSize: 16, fillColor: '#eeeeee'};

    dd.images = {};
    dd.images.logo = 'data:image/png;base64,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';
    dd.images.two11 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIwAAAAgCAMAAAD3wGCZAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAGBQTFRF7BcNpqamEhAR8VZQ5+fn+87NlZWV/fz8T09QeXl5+bKw29vb9o6LyMjI/eXk7+/v/vf37zkw+sG/9HRvYmFi+KKg/Nzctra2RENEKCgpOTg5/uzr+Pn59fX1/vHx////xwsRzAAABEZJREFUeNrEmImSqyoQhgWRRURcUAS393/L243Lyclk7qmpmsmQqmgU4ePvH7CT7e8pYqvHoii6ohjrufmkUvYGkGbshj5v2yyVts37qiy234BpxrJvT4o2zy+mNq8+8vwwTNMlEhBj6CBA9QilK6s8EfVD/U6YhNL2w/gkgqi7KgecfNjeBbNViDKML/0q5g71yYv3wBQ5omz/M8MQpx0Enhpv7A/CdDDuvv7HhB+gUgXKacK52TOhDRb25c6stumotfiEpR2aq6o5Kwummb0PWA3kq4RIMGtmHQ1Qov8qjDkeWZ1bX9wdc2A5TlfvYogy1bYuRrLv7DicFbNhZ8QTUIZNAU54CPqrMDQ1t8rpBUzTYxdH8TSVgDQsUMrvw2EtkHAEqUBggHHHE3BTc+WXnXkLhjLLvhoANJzA92KYJgwGyaEC+o0bE04YxzDeizEQLuv1FaT+si6hQTmgQQXtdMDAgVzgJdSFJuHpzE5SnDA+hIm6xQQOtUEpA4PhGEOyMylD1EzSGKTeF0VDjAeMcHgK5y5q7NifwrTd1RmHJxpF6cQSRXiGaSCi4zG17TSBf30MmgVpAUrtoJWh0KoK0DjH7rSNVLHVJUIHV5XQ09Hv4uAJK4P20PziQpoJY5vl1+oiGF7iIcH8USbcMDtMqeGCQQNjRDk1aaCrCisJUe3SCehEM1BtCU4AoYJZAP3JaFHL1NwiJ4sG4itUYUFdURr+NhEog7deKYOuqS6Y6MHJQK2ShxVlPhinlNTBA6mcJARkxV48DfhLmog2uzzjHLhIw30VAPuYlF32BKPjYWB7UPytTJ1MgzCngfcLBga+RCWJn1RkNiKp98wGJTA6+MuwCDLdMFIiDFqOejcda07xDAPCpG5eGRhnd38pg40drkfmAKZ3NGrwhDs9oKVOMAblEVzt6B2IKjk9k374fZmmwJ+Ev2Z3oDFNsz9helCmu8PEbhgrKScSjUOoxE44Dn+CNUiuDGFgfMrjZRMiUfQ28MRVwHFzei1WdZ7l8x8W7PuI30tlqqwtD5hV8Ws5ZyoEafDEQU3vsGUDU1rp3Sp8duER4HCkU5BEmQRDuIpB4cKn6RVxUWXZPbVxJaATIRwWolfKIPn4YtdePy6mwj5eW+xBLtbHDWk5tCXBP0yQ/N4kCSy/uAaD014pU90x/b5dm0E4lwfps775aztIMCx+2A5gAb5C+n0wepoetrcNNqdzQ/BSOfw4IvYVDiAfHszNci/W3wezsPVp2z5fZ9ZmaaCsKZiiSd9Ls4j7hab8+Te9EbTJS/HPOm35jtfOucIMoGg+rVBXTy/BP5od4Gtc1pf1K3m2Ir2uV/PbUpVtQJwWEsjHlFZs45GptP341oxyHq4srhrKDkpZVmcOBznl23PtrRjO/PahQHbbzeI3Ev+9qYuh6jHRhk/eQ6o7buKX/oU4jNI0c13X8zw3n073/wQYACw0uq8pyY1QAAAAAElFTkSuQmCC';
    dd.images.fullAcc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUFDMkM3QTlERUM5MTFFNEI2MERDMTlCM0ZDODlDNEIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUFDMkM3QUFERUM5MTFFNEI2MERDMTlCM0ZDODlDNEIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBQUMyQzdBN0RFQzkxMUU0QjYwREMxOUIzRkM4OUM0QiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBQUMyQzdBOERFQzkxMUU0QjYwREMxOUIzRkM4OUM0QiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PnKh6rUAAAJHSURBVHjatFUxa1pRFD6JVhRRxEEiHUpAEXVQwepiN10UsjrpICJ0KYLiGkHwB1REdBKngOhQ6FDEmnRRIaNBUDejDlZIFEFr8PTeS/pI2zz1lebA9zjcd/ju975z37lHAPCGIEfwluAHAcK/xTHBK4ImwXu68PWR7H/iMyWe7Spyu93ocrmEEk8p8ZivIBQK4a/w+XxCiMfUly2faSaTict1Op0QvxnnLd/OCoUCy+UyXlxcoFgsFqL49njXtmq1GrRaLRiNxt/UHxq8iqPRKOdxMpkUpFi8a8f5fM7lZrMZ7HY7yGQyWCwW0Ol04OHhQbjiYDCI6XQa7+/v8c8YDAYolUqFK06lUpBIJCAej8NyuQSlUgnX19eQyWRAIpEA2YwpX61Whyu2Wq1MVSQSQb1ez6mczWbYbrex2Wxit9vFm5sbVsun+C/iQqGAo9GI5SqVCvv9PvJFo9E43AqDwQCtVovld3d34PF4wOl0cu9pw7bbLYTDYfB6vUB6AaVSab8VV1dXWKlU9h4pasNms8HxeIwWiwUdDgcS//mtyOfzOJlMdpKenp5iNpvFXC7H2TKdTlGj0fAT22w2VkhOBC9xtVplRCcnJ6yZw+EQiS0oEon4iSnOz88ZOf3z5HI5t06J6BfR8Pv9XIOf1jwlfnZsxmIxRtDr9bBWq2G9XmfK1us1np2d7R2bR4+DXv1cV+nwCQQC7FcmjYLLy0soFotAbNg3f77Tx5cXuJo+UcWvCT4SvKPHdNfgP+AyFRF8I/jwU4ABABFYIvc7qJgVAAAAAElFTkSuQmCC";
    dd.images.partAcc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUJCN0Q4OUFEQ0JFMTFFNDgzNUZBODM4NzRCQ0M4NjQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUJCN0Q4OUJEQ0JFMTFFNDgzNUZBODM4NzRCQ0M4NjQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBQkI3RDg5OERDQkUxMUU0ODM1RkE4Mzg3NEJDQzg2NCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBQkI3RDg5OURDQkUxMUU0ODM1RkE4Mzg3NEJDQzg2NCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgzlaBYAAAQPSURBVHjajFVdTJtlFD7fX38YtCNggmTUgs1cDOIPi5uJEkxWEM0cXTS7GkY02t0YFnDGC9FWCmYyjDNxRjqWmF2IHTcrCIUEEvaTYb2Y4WamAUwcoqUZiRX6+33H875dKx0/9SQnfd/znT7v+53znOcTQJRKRUkakCWpBRGBLA2bTBAE0CguQEGTyTXyK+QfCjqD0ZeMx14jCFAMBoAMeBYVUvFYbivKCkgS+z8WOuQrqf2tt7857mg1Tk9Pg5ZOg6wo/An7q5pMQGPji/D1hQtQVl4OPweDdHsNRFEsBFwBnV3vr1AJsLOzi2GhKMuoMxQhlYjeX8T5+XnMWv3BgzyH3hIVvWE3XxL/jkZVdkR//+dw5swH/NbJ+AbhSqwSMDs7C6qqwq25n2B5eZnVBxALliIN7zhP3cVN9lF3N2YqIfDfKosFr12/jk7nKb6XFF2h2zIPbQFm1t398X1wwLP9/ZhKpTASiWBt7RMZcJ0eZfLdgLftgsv1Cbjdn/K1paoKZFmGsrIy2Fe1j8dYU9Pku9m2wJqmwZ1f70CJyQSxjY1c3O12gd/vh6mpKWp6Fwdnuf8buPmlFlhcWISxsR9B1f5rVMmeEkhRc1lIUzXeRA4sCNtOS559OzgIN2/egLV794gp/fBXeDX37PYvt+HqVT/sLS0lLgv8AoGJcVAJWCIW5dnm5tHp+Ex9PZ4bOIcLC4u8Ue86nbiT/bO+jo/X1m7H7VDejZeWliC8GoHWY61wcegijwUCAfCPjoLNZgM1rfKpS1BtzVT/mpoa+GJgAJqbmoj7sfsjL20tRTgcBoVGmolOKBTisd/osFePHoXy8ocgraY5CdNUZ7ZmjWyy2+H1EyfANzxMw5XKDNaDwOa9ZkjSbUjpOM2Y0XjzSYxEVvNKqC/aA4HJSWhsaICzfZ/Bc4cPU04Eej0ekHWGfFbYHrWBqbgYZmZmoK3tDR5joIreSAcYSf2MudwhajIDc/d4wFpthdMdHWA0GrKiCFsmz+Vyoclk5uvevr7cBG72N9vb+fNWx3G+93g82NzyMl/LmZHfOtLRaBQtj1jxyBE734+PT6DD4cC6uifRbrfjoHeQx3sITJaVnIZwl2RUMuwIwXsdp/98kEakYmi1WvGxAwfwB58PY/EY/rGyghuxOAaDQaJkRj7HRsd4/neXL+fAs7IJxxyOyE4cPXmyDS2kbtbqaqx76mm07d+PlZWV+OyhQ3hrbi4v3+v10hvIWU4vMIHxfnn+/I5DkEwkcHJyCi8NXcKRkRH8ffnujrnfDw+jTq9DUZJ7BPpKFANqvc+/0PBKRcXDQjKVVDPfJvYBEaGEWGI2mznxmTasr6/D2toaaYjKRT9rRUVGJZVMJcYnxn3xWNz9rwADAJyR120mRn7MAAAAAElFTkSuQmCC";
    dd.content = [];
    //var x = columnWidths();
    var masterTbl = {};
    masterTbl.style = 'orgRows';
    masterTbl.table = {};
    masterTbl.table.widths = ['*','*']; //We will put listing 2-up
    masterTbl.table.headerRows = 0;
    masterTbl.table.body = [];
    masterTbl.table.body[0] = [];   
    
    var tbl = {};
    tbl.style = 'orgRows';
    tbl.table = {};
    //table widths must match columns or js error
    //tbl.table.widths = ['90%','10%']; //columnWidths(); //['*', '*', 100, '*', '*', 100, '*','*'];
    tbl.table.widths = ['*']; //columnWidths(); //['*', '*', 100, '*', '*', 100, '*','*'];
    tbl.table.headerRows = 0;
    tbl.table.layout = {defaultBorder: false };
    tbl.table.body = [];
    tbl.table.body[0] = [];

    //$.merge(tbl.table.body[0],["Org Name"]); //addHeaders());

    dd.content.push({text: 'List of Organizations',style: 'listingtitle'});
    //dd.content.push({canvas: [{type: 'line', x1: 0, y1: 5, x2: 560, y2: 5, lineWidth: 1 } ]});

    var rowcnt = 0;
    //TODO: do we need to get all details for each reported item? for now no.. repeat listing
    
    //The 211 data contains contaions some basic HTML <b> <br> etc which nmakes this a little more difficult if we want to keep that formatting, so we try.
    $.each(gblFilteredData, function( idx, item) {

        var org = gblOrgSrchData[item.fid];
        tbl.table.body[rowcnt] = [];
        var colStr = "<div><p><b>" + org.nme + "</b></p><p>" + org.adr + "</p>";
        var ph = "";
        if (objectPropertyHasValue(org.ph)) ph = org.ph;
        if (objectPropertyHasValue(org.web) && ph.length > 0) ph +=  (" | <a href='" +  org.web + "'>" + org.web + "</a>");
        if (objectPropertyHasValue(org.web) && ph.length === 0) ph = org.web;
        colStr += "<p>" + ph + "</p><br>";
        if (objectPropertyHasValue(org.sls)) colStr += "<p>Service Language: " + org.sls + "</p>";
        if (objectPropertyHasValue(org.ens)) colStr += "<p>Eligibility: " + org.ens + "</p>";
        var col1 = [];
        //col1.push({text:  colStr, style : 'tblcol1', border: [true, true, false, true]});
        var accImg = "";
        if (org.acc === "F") accImg = 'fullAcc';
        if (org.acc === "P") accImg = 'partAcc';
        //if (objectPropertyHasValue(org.ens)) {
        colStr += "</div>";
        pdfMakeHTMLConverter.ParseHtml(col1, colStr);
        
        var cols = [];
        cols.push(col1);
        if (accImg !== "") {
            cols.push({image : accImg, width: 20, alignment: 'right', border: [false, true, true, true]});
        }
        
        //dd.content.push( {columns: cols , style : 'orgListing'});
        //dd.content.push({canvas: [{type: 'line', x1: 0, y1: 5, x2: 560, y2: 5, lineWidth: 1 } ]});
        
        //}

        
        //tbl.table.body[rowcnt].push({text:  colStr, style : 'tblcol1', border: [true, true, false, true]});
        col1[0].border = [false, true, true, true];
        tbl.table.body[rowcnt].push({columns: cols , style : 'orgListing'});
        //if (accImg !== "") {
        //    tbl.table.body[rowcnt].push({image : accImg, width: 20, alignment: 'right', border: [false, true, true, true]} );
        //}
        
        //tbl.table.body[rowcnt].push({text: "link" , link: org.web});
        rowcnt++;

        });

        dd.content.push( tbl );

      // dd.content.push({text: "link" , link: 'www.google.com', decoration:"underline"});
      
    var selCrit = "Selection Criteria: ";
    //var selectedTopics = decodeTreeView($("#topicTreeView"),'text');
    var selectedTopics = decodeMultiSelectionTexts($("#topicFilter"));
    var selectedAccs = decodeMultiSelectionTexts($("#accFilter"));
    var selectedLangs = decodeMultiSelectionTexts($("#langFilter"));

    if (gblShowFavsOnlyInd) {
        selCrit += "favourited organizations";
    } else {
        selCrit += "Topics - " + selectedTopics + "; ";
        selCrit += "Languages - " + selectedLangs + "; ";
        selCrit += "Accessibility - " + selectedAccs;
    }
    dd.content.push({text: selCrit, style: 'footertext'});
    dd.content.push({text: "Link to selection on City of Toronto's Youth Services website" , link: window.location, decoration:"underline", style: 'footertext'});
    pdfMake.createPdf(dd).download("YouthServices.pdf", pdfCB);
    
}



function loadMainPage() {
    var strCode="";
    var htmlLoad = "";
    
    if (document.location.hostname.length === 0 || document.location.hostname === 'localhost') {
        markerImages = { single : "images/markergreen.png",
                        fav : "images/markergreen_sel.png",
                        multi : "images/markerblue.png",
                        selected : "images/yellow_icon.png",
                        nolatlng : "images/marker_dot_multi.png",
                        listingMarker : "images/m2.png",                        
                        foundMarker : "images/marker_sel.png"
                        };
        accImages = {   F: { img: "images/fullyaccessibleicon.png",  title : "Fully Accessible"},
                        P: { img: "images/partiallyaccessibleicon.png", title : "Partially Accessible"}
                    };                      
        strCode += '<link rel="stylesheet" href="css/youthServices.css">';
        strCode += '<link rel="stylesheet" href="static_files/assets/css/bootstrap-multiselect.css">';
        //strCode += '<script type="text/javascript" src="static_files/assets/multiselect/bootstrap-multiselect.js"></script>';
        strCode += '<script type="text/javascript"  src="static_files/assets/pdfmake/pdfmake.js"></script>';
        strCode += '<script type="text/javascript"  src="static_files/assets/pdfmake/pdfmake-master/pdfmake-master/build/vfs_fonts.js"></script>';
        strCode += '<script type="text/javascript"  src="js/pdfmakeHTMLConverter.js"></script>';
        //strCode += '<script type="text/javascript" src="static_files/assets/placeholders/placeholders.min.js"></script>';
        strCode += '<script type="text/javascript"  src="js/bootbox.min.js"></script>';
        
        htmlLoad = 'html/YouthServices.html';
    } else {
        markerImages = { single : "/static_files/WebApps/images/markergreen.png",
                        fav : "/static_files/WebApps/images/markergreen_sel.png",
                        multi : "/static_files/WebApps/images/markerblue.png",
                        selected : "/City Of Toronto/Sandbox/Steve/YouthServices/images/Yellow_icon.png",
                        nolatlng : "/static_files/WebApps/images/marker_dot_multi.png",
                        listingMarker : "/static_files/WebApps/images/m2.png",
                        foundMarker : "/static_files/WebApps/images/marker_sel.png"
        };
        accImages = { F: { img: "/static_files/WebApps/images/fullyaccessibleicon.png",  title : "Fully Accessible"},
                      P: { img: "/static_files/WebApps/images/partiallyaccessibleicon.png", title : "Partially Accessible"}
        };
        
        strCode += '<link rel="stylesheet" href="/City%20Of%20Toronto/Sandbox/Steve/YouthServices/css/youthServices.css">';
        strCode += '<link rel="stylesheet" href="/static_files/assets/multiselect/bootstrap-multiselect.css">';
        strCode += '<script type="text/javascript" src="/static_files/assets/multiselect/bootstrap-multiselect.js"></script>';
        strCode += '<script type="text/javascript" src="/City%20Of%20Toronto/Sandbox/Steve/YouthServices/js/pdfmake.js"></script>';
        strCode += '<script type="text/javascript" src="/static_files/assets/pdfmake/vfs_fonts.js"></script>';
        strCode += '<script type="text/javascript" src="/City%20Of%20Toronto/Sandbox/Steve/YouthServices/js/pdfmakeHTMLConverter.js"></script>';
        strCode += '<script type="text/javascript" src="/static_files/assets/placeholders/placeholders.jquery.min.js"></script>';
        strCode += '<script type="text/javascript" src="/static_files/assets/bootbox/bootbox.min.js"></script>';
        strCode += '<script type="text/javascript" src="/static_files/assets/oms/oms.min.js"></script>';
        htmlLoad = '/City%20Of%20Toronto/Sandbox/Steve/YouthServices/html/YouthServices.html';
    }
    $("#appCode").html(strCode);
    $("#appDisplay").load(htmlLoad, function() {
        initApp("main");
        setUpEvents();
    });


}

//TODO.. what if not lat/long

function initDetailMap(org) {

    if (!org.latitude || !org.longitude) {
        $("#detailMap").hide();
    } else {


        detMap = new google.maps.Map(document.getElementById('detail-map-canvas'), {
            center: MAP_CENTER,
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: true,
            mapTypeControlOptions: {style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,position: google.maps.ControlPosition.TOP_RIGHT},
            zoomControl: true
        });

        var latLng =  new google.maps.LatLng(org.latitude, org.longitude );
            var marker = new google.maps.Marker({
            position: latLng,
            map: detMap,
            orgId: org.fid,
                //icon: markerImages[imageIndex],
            title: org.nme
        });
        detMap.setCenter(latLng);
    }
    //TODO: does this go into too deep.. should it even be here
    /*
    if(navigator.geolocation) {
        browserSupportFlag = true;
        navigator.geolocation.getCurrentPosition(function(position) {
            initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
            map.setCenter(initialLocation);
            map.setZoom(11);
            }, function() {
                //handleNoGeolocation(browserSupportFlag);
        });
    }
    */
}
/* By convention ID tags will match json properties with org-<property>
We must clean out old tags!!!
*/
function initDetails(orgId) {
    var request = getOrganizationData(orgId);
    $.when(request).done(function(org,status,state){

        $("#headerText").text(org.orgName);

        Object.keys(org).forEach(function(key, idx, array) {
            var eleId = "#org-"+ key;
            $(eleId).html(org[key]);
            $(eleId + "-span").show();
        });
        $('#org-email').attr('href','mailto:' + org.email);
        $('#org-web').attr('href', "http://" + org.web);

        $('#ttcBtn').click(function () {
            window.open(TTCPlanner + org.address, "_blank");
        });

        $('#org-services').html(org.services.replace(/\*/g,"<br>*"));
        $('#211Link').attr('href', "http://www.211toronto.ca/detail/en/" + org.fid);
        
        initDetailMap(org);
    });

}

(function($) {
    $.QueryString = (function(a) {
        if (a === "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'));
})(jQuery);

/* this only seems to work in firefox...  http://stackoverflow.com/questions/1234008/detecting-browser-print-event*/
(function() {
    var beforePrint = function() {
        NO_ORGS_TO_ADD = 10000;
        showListing();
        console.log('Functionality to run before printing.');
    };
    var afterPrint = function() {
        console.log('Functionality to run after printing');
    };

    if (window.matchMedia) {
        var mediaQueryList = window.matchMedia('print');
        mediaQueryList.addListener(function(mql) {
            if (mql.matches) {
                beforePrint();
            } else {
                afterPrint();
            }
        });
    }

    window.onbeforeprint = beforePrint;
    window.onafterprint = afterPrint;
}());

$( document ).ready(function() {
    loadMainPage();
});

})(this);
