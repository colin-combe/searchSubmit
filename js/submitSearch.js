var CLMSUI = CLMSUI || {};

CLMSUI.buildSubmitSearch = function () {
    function canDoImmediately () {

        // Make acquisition and sequence divs via shared template
        var acqSeqTemplateData = [
            {id: "#sequence", fields: {"singleLabel":"Sequence", "pluralLabel":"Sequences", "partialId":"seq",}},
            {id: "#acquire", fields: {"singleLabel":"Acquisition", "pluralLabel":"Acquisitions", "partialId":"acq",}},
        ];
        acqSeqTemplateData.forEach (function (datum) {
            d3.select(datum.id).html (tmpl("template-acqseq-section", datum.fields));
        });


        // Make number inputs
        var numberInputSettings = [
            {domid: "#paramTolerance", niceLabel: "Ms Tolerance", min: 0, default: 4,},
            {domid: "#paramTolerance2", niceLabel: "Ms2 Tolerance", min: 0, default: 20,},
            {domid: "#paramMissedCleavages", niceLabel: "Missed cleavages", min: 0, default: 4,},
        ];
        numberInputSettings.forEach (function (settings) {
            var elem = d3.select(settings.domid);
            elem.append("p").text(settings.niceLabel);
            var iid = settings.domid.slice(1)+"Value";
            var inputElem = elem.append("input")
                .attr("name", iid)
                .attr("id", iid)
                .classed("formPart", true)
            ;

            var spinner = $("#"+iid).spinner({
                min: settings.min,
                max: settings.max,
                value: settings.default,
            });

            $("#"+iid).spinner("value", settings.default);

            elem.selectAll(".ui-spinner")
                .style("vertical-align", "baseline")    // baseline is different to selectmenu, causing vertical offset
                .style("width", "5em")
            ;
        });


        // Make unit drop-downs
        var unitSettings = [
            {domid: "#paramTolerance", units: ["ppm", "Da"], default: "ppm",},
            {domid: "#paramTolerance2", units: ["ppm", "Da"], default: "ppm",},
        ];
        unitSettings.forEach (function (settings) {
            var elem = d3.select(settings.domid);
            var baseId = settings.domid.slice(1)+"Units";
            var selElem = elem.append("select")
                .attr("name", baseId)
                .attr("id", baseId)
                .classed("formPart", true)
            ;
            var optionJoin = selElem.selectAll("option").data(settings.units);
            optionJoin.enter()
                .append("option")
                .text (function(d) { return d; })
                .property ("selected", function(d) { return d === settings.default; })
            ;

            $("#"+baseId).selectmenu();

            elem.selectAll(".ui-selectmenu-button").style("width", null);   // calculated width in selectmenu is dodgy, kill it
        });


        // Make accordions
        var accordions = ["#acqAccordion", "#seqAccordion"];
        accordions.forEach (function (accordion) {
            $(accordion).accordion ({
                collapsible: true,
                active: false,
                heightStyle: "content",
            });
        });


        // Make buttons
        $("#startProcessing").button();       
    };

    $(document).ready( function () {

        // http://stackoverflow.com/questions/23740548/how-to-pass-variables-and-data-from-php-to-javascript
        var oReq = new XMLHttpRequest(); //New request object
        oReq.onload = function() {
            //This is where you handle what to do with the response.
            //The actual data is found on this.responseText
            var result = this.responseText;
            //console.log ("result", result);
            var data = JSON.parse (result);
            console.log ("data", data);

            if (data.error) {
                alert ("Tell Colin: "+data.error);
            }
            else {
                var dispatchObj = d3.dispatch ("formInputChanged", "newEntryUploaded");

                // Make combobox and multiple selection elements
                // Multiple Select uses Jquery-plugin from https://github.com/wenzhixin/multiple-select
                // Multiple Selects need [] appended to name attr, see http://stackoverflow.com/questions/11616659/post-values-from-a-multiple-select
                var populateOptionLists = [
                    {data: data.xlinkers, defaultField: "is_default", domid: "#paramCrossLinker", niceLabel: "Cross-Linker", filter: true, required: true, multiple: false, placeHolder: "Select A Cross Linker",},
                    {data: data.enzymes, defaultField: "is_default", domid: "#paramEnzyme", niceLabel: "Enzyme", filter: true, required: true, multiple: false, placeHolder: "Select An Enzyme",},
                    {data: data.modifications, defaultField: "is_default_fixed", domid: "#paramFixedMods", niceLabel: "Fixed Modifications", required: false, multiple: true, filter: true, placeHolder: "Select Any Fixed Modifications",},
                    {data: data.modifications, defaultField: "is_default_var", domid: "#paramVarMods", niceLabel: "Var Modifications", required: false, multiple: true, filter: true, placeHolder: "Select Any Var Modifications",},
                    {data: data.ions, defaultField: "is_default", domid: "#paramIons", niceLabel: "Ions", required: true, multiple: true, filter: false, placeHolder: "Select At Least One Ion",},
                    {data: data.losses, defaultField: "is_default", domid: "#paramLosses", niceLabel: "Losses", required: false, multiple: true, filter: false, placeHolder: "Select Any Losses",},
                ];
                populateOptionLists.forEach (function (poplist) {
                    var elem = d3.select(poplist.domid);
                    elem.append("p").text(poplist.niceLabel);
                    var baseId = poplist.domid.slice(1)+"Select";
                    var selElem = elem.append("select")
                        .attr("id", baseId)
                        .attr("name", baseId + (poplist.multiple ? "[]" : ""))  // magic. Need [] at end of name of elements that can submit multiple values
                        .attr("data-label", poplist.niceLabel)    
                        .classed("formPart", true)
                        .property("multiple", poplist.multiple)
                        .property("required", poplist.required)
                    ;

                    var dataJoin = selElem.selectAll("option")
                        .data(poplist.data, function(d) { return d.id; })
                    ;

                    dataJoin.enter().append("option")
                        .attr("value", function(d) { return d.id; })
                        .text(function(d) { return d.name; })
                        .property ("selected", function(d) { return d[poplist.defaultField] === 1 || d[poplist.defaultField] === 't'; }) // pre-select
                    ;

                    //if (poplist.multiple) {
                        $("#"+baseId).multipleSelect({ 
                            single: !poplist.multiple,
                            filter: poplist.filter, 
                            placeholder: poplist.placeHolder,
                            multiple: true, // this is to show multiple options per row, not to do with multiple selections (that's single)
                            width: 450,
                            multipleWidth: 200,
                            onClick: function (view) {
                                dispatchObj.formInputChanged();   
                            },
                        });
                        elem.selectAll(".ms-choice")
                            .classed("ui-widget", true)
                            .classed("ui-state-default", true)
                        ;
                    /*
                    } else {
                        $("#"+baseId).combobox();
                    }
                    */
                });



                // Make previous acquisition and sequence tables
                var prevTableClickFuncs = {}; // so we can keep these for later
                // Routine for sorting datatable column of checkboxes via dom element values
                $.fn.dataTable.ext.order['dom-checkbox'] = function  ( settings, col ) {
                    return this.api().column(col, {order:'index'}).nodes().map (function (td, i) {
                        return $('input', td).prop('checked') ? '1' : '0';
                    });
                }
                var previousSettings = [
                    {domid: "#acqPrevious", data: data.previousAcqui, niceLabel: "Acquisitions", required: true, selectSummaryid: "#acqSelected",},
                    {domid: "#seqPrevious", data: data.previousSeq, niceLabel: "Sequences", required: true, selectSummaryid: "#seqSelected",},
                ];
                previousSettings.forEach (function (psetting) {
                    var sel = d3.select (psetting.domid);
                    var baseId = psetting.domid.slice(1)+"Table";
                    sel.html ("<TABLE><THEAD><TR></TR></THEAD><TBODY></TBODY></TABLE>");
                    sel.select("table").attr("id", baseId);
                    var hrow = sel.select("tr");
                    var headers = d3.keys(psetting.data[0]);
                    headers.push("selected");
                    hrow.selectAll("th").data(headers).enter().append("th").text(function(d) { return d; });

                    var tbody = sel.select("tbody");
                    var rowJoin = tbody.selectAll("tr").data(psetting.data, function(d) { return d.name; });
                    var newRows = rowJoin.enter().append("tr");

                    var cellJoin = newRows.selectAll("td").data (function(d) { return d3.values(d); });
                    cellJoin.enter().append("td").text(function(d) { return d; })

                    newRows.append ("td").append("input")
                        .attr ("type", "checkbox")
                    ;

                    var table = $("#"+baseId).dataTable ({
                        "paging": true,
                        "jQueryUI": true,
                        "ordering": true,
                        "columnDefs": [
                            {"orderDataType": "dom-checkbox", "targets": [-1],} // -1 = last column (checkbox column)
                        ]
                    });

                    // this stuffs a hidden input field in the main parameter search form
                    d3.select("#parameterForm").append("input")
                        .attr ("class", "formPart")
                        .attr ("type", "hidden")
                        .attr ("name", baseId+"[]") // add [] for php because passed value can/will be an array (tho for a hidden input the array is stringified in the value attr first and we need to split it before submission)
                        .attr ("id", baseId+"Hidden")
                        .attr ("data-label", psetting.niceLabel)   
                        .attr ("value", "")
                        .property ("required", psetting.required)
                    ;

                    // on a selection in the table, we then smuggle the current selection set of ids into the hidden form
                    // where they can be picked up on the parameter form submit, and show the current selection to the user
                    prevTableClickFuncs[baseId] = function () {
                        var dtCells = $("#"+baseId).DataTable().rows().nodes(); // loads of tr dom nodes
                        var checkedCells = $(dtCells).has("input:checked"); // just the ones with a ticked checkbox
                        var checkedData = d3.selectAll(checkedCells).data();

                        var ids = checkedData.map (function(d) { return +d.id; });
                        d3.select("#"+baseId+"Hidden").property("value", "["+ids.join(",")+"]");  // Put the ids in the hidden form element

                        var names = checkedData.map (function(d) { return d.name; });
                        d3.select(psetting.selectSummaryid).text (names.length ? "Selected "+names.join(", ") : null);  // Put names in label

                        dispatchObj.formInputChanged();
                    }; 

                    newRows.selectAll("input[type=checkbox]")
                        .on ("click", prevTableClickFuncs[baseId])
                    ;   
                });



                // Make checkbox/radio choice controls - not currently used
                var buttonGroups = [
                    //{domid: "#paramIons", choices: data.ions, type: "radio", nameFunc: function(d) { return d.name; },},
                    //{domid: "#paramLosses", choices: data.losses, type: "radio", nameFunc: function(d) { return d.name; },},
                ];
                buttonGroups.forEach (function (buttonGroup) {
                    var elem = d3.select (buttonGroup.domid);
                    elem.attr ("class", "formPart");
                    var baseId = buttonGroup.domid.slice(1)+"Choice";
                    var choiceJoin = elem.selectAll("input").data(buttonGroup.choices);
                    choiceJoin.enter()
                        .append ("label")
                        .attr ("for", function(d,i) { return baseId+i; })
                        .text (buttonGroup.nameFunc)
                    ;
                    choiceJoin.enter()
                        .append("input")
                        .attr ("type", buttonGroup.type)
                        .attr ("id", function(d,i) { return baseId+i; })
                        .attr ("name", buttonGroup.type === "radio" ? baseId : null)
                    ;

                    $(buttonGroup.domid).buttonset();
                });



                // Sections to control availability of main submit button and explain why disabled if so
                d3.select("#todo").selectAll("span").data(["ui-icon","notice"])
                    .enter()
                    .append("span")
                    .attr ("class", function(d) { return d; })
                ;

                var happyToDo = function (happy) {
                    d3.select("#todo span.ui-icon")
                        .classed ("ui-icon-notice", !happy)
                        .classed ("ui-icon-check", happy)
                    ;
                    d3.select("#todo")
                        .classed ("paramSubmitReady", happy)
                    ;
                }

                var toDoMessage = function (msg) {
                    d3.select("#todo span.notice").html(msg);
                };

                dispatchObj.on ("formInputChanged", function () {
                    var todoList = d3.set();
                    d3.select("#parameterForm").selectAll(".formPart[required]").each (function() {
                        if (this.id && !this.value) {
                            todoList.add (d3.select(this).attr("data-label") || d3.select(this).attr("name"));
                        }
                    });
                    $("#startProcessing").button("option", "disabled", !todoList.empty());
                    happyToDo (todoList.empty());
                    toDoMessage (todoList.empty() ? "Ready to Process" : "Values are required for:<br>"+todoList.values());
                });
                dispatchObj.formInputChanged();



                // AJAX form submission
                // PITA have to reconstruct form data from all fields (marked them with .formPart class to make it easier)
                $("#parameterForm").submit(function (event) {
                    event.preventDefault();

                    $("#startProcessing").button("option", "disabled", true);   // so user can't press again
                    toDoMessage ("Processing");
                    var formData = {};
                    d3.select("#parameterForm").selectAll(".formPart").each (function() {
                        if (this.id) {
                            var val = this.value;
                            // If one of the multiple select widgets, must get multiple values like this
                            if (this.type === "select-multiple") {
                                val = $("#"+this.id).multipleSelect("getSelects");
                            }   // if a string begin with '[' then is an array string we need to split
                            else if (val.charAt(0) === '[') {
                                val = val.slice(1, -1).split(",");
                            }
                            formData[this.name] = val;
                        }
                    });
                    console.log ("formData", formData);

                    $.ajax ({
                        type: "POST",
                        url: "php/submitParams.php",
                        data: formData,
                        dataType: "json",
                        encode: true,
                        success: function (response, textStatus, jqXhr) {
                            console.log ("db params insert success", response, textStatus);
                            if (response.status == "success") {
                                toDoMessage ("Success, Search ID "+response.newSearch.id+" added. Refresh page to add new search.");
                            } else {
                                toDoMessage ("Error, "+response.error+".");
                                happyToDo (false);
                                $("#startProcessing").button("option", "disabled", false);
                            }
                        },
                        error: function (jqXhr, textStatus, errorThrown) {
                            console.log ("db params insert error", textStatus, errorThrown);   
                            toDoMessage ("Error, "+errorThrown+".");
                            happyToDo (false);
                            $("#startProcessing").button("option", "disabled", false);
                        },
                    });
                });


                // initialize blueimp file uploader bits
                $(submitter.upload);


                // Function to control actions/consequences of upload/delete buttons in seq/acq upload forms
                // Includes logic to enable/disable buttons if using them makes no sense
                var formActions = function (textinputid, formid, type) {
                    var nonzeroes = {filesAwaiting: 0, namelength: 0,};
                    var enabler = function () {
                        var vals = d3.values (nonzeroes);

                        var submitBlocked = vals.some (function(d) { return d === 0; });
                        var buttons = $(formid+" button[type='submit']");
                        buttons.button ("option", "disabled", submitBlocked);

                        var resetBlocked = (nonzeroes.filesAwaiting === 0);
                        var buttons = $(formid+" button[type='reset']");
                        buttons.button ("option", "disabled", resetBlocked); 
                    };
                    this.buttonEnabler = enabler;
                    var uploadSuccess = true;
                    var filesUploaded = [];
                    var rowCountFunc = function () { return d3.select(formid).selectAll("tr.template-upload").size(); };   // data.files.length;

                    $(formid).on({
                        "fileuploadstart": function (e, data) {
                            console.log ("started", e, data);
                            uploadSuccess = true;
                        },
                        "fileuploadadded": function (e, data) {
                            nonzeroes.filesAwaiting = rowCountFunc();
                            enabler();
                        },
                        "fileuploadfailed": function (e, data) {                         
                            console.log ("failed", data);
                            //console.log ("failed", data.jqXHR.responseText);
                            if (data.errorThrown === "abort") {
                                nonzeroes.filesAwaiting = rowCountFunc();
                                enabler();
                            }
                            uploadSuccess = false;
                        },
                        "fileuploaddone": function (e, data) {
                            console.log ("done", e, data);
                            filesUploaded.push (data.files[0].name);
                        },
                        "fileuploadstopped": function (e, data) {
                            console.log ("stopped", e, data, uploadSuccess);
                            if (uploadSuccess) {
                                var formData = {
                                    name: d3.select(textinputid).property("value"),
                                    filenames: filesUploaded,
                                    type: type,
                                };
                                $.ajax ({
                                    type: "POST",
                                    url: "php/submitSeqAcq.php",
                                    data: formData,
                                    dataType: "json",
                                    encode: true,
                                    success: function (response, textStatus, jqXhr) {
                                        console.log ("db acq/seq insert success", response, textStatus);
                                        dispatchObj.newEntryUploaded (type, response.newRow);    // alert new row has been added to db
                                    },
                                    error : function (jqXhr, textStatus, errorThrown) {
                                        console.log ("db acq/seq insert error", textStatus, errorThrown);    
                                    },
                                });
                                filesUploaded.length = 0;
                            }
                            nonzeroes.filesAwaiting = rowCountFunc();
                            enabler();
                        },
                    });
                    d3.select(textinputid).on("input", function () {
                        nonzeroes.namelength = this.value.length;
                        enabler();
                    });

                    return this;
                };

                // if new row added, then add it to the correct table of previous results
                dispatchObj.on ("newEntryUploaded", function (type, newRow) {
                    var tableId = type+"PreviousTable";
                    var dataTable = $("#"+tableId).DataTable();
                    newRow.selected = "<input type='checkbox' checked>";    // add a ready selected checkbox as a html string
                    var newRowNode = dataTable.row
                        .add(d3.values(newRow)) // push the newrow as new table row data
                        .draw()                 // redraw the table
                        .node()                 // return the tr dom node for further manipulation
                    ;
                    d3.select(newRowNode)
                        .datum(newRow)  // set the row data on the new tr dom node as a d3 datum
                        .select("input[type=checkbox]")
                        .on ("click", prevTableClickFuncs[tableId])    // so that calling this function works on click
                    ;   
                    prevTableClickFuncs[tableId] ();   // and we call the same func here as the checkbox is set pre-selected
                });

                // Make the two file upload forms
                var seqFormActions = new formActions ("#newseqID", "#seqfileupload", "seq");
                var acqFormActions = new formActions ("#newacqID", "#acqfileupload", "acq");
                [seqFormActions, acqFormActions].forEach (function(formAct) { formAct.buttonEnabler(); });
            }
        };

        oReq.open("get", "php/populate.php", true);     // true == asynchronous call
        oReq.send();
    });

    canDoImmediately();
};