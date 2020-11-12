/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

/** Module Description
 * 
 * NSVersion    Date                        Author         
 * 2.00         2020-10-22 09:33:08         Anesu
 *
 * Description: Automation of Debt Collection Process   
 * 
 * @Last Modified by:   Anesu
 * @Last Modified time: 2020-10-22 16:49:26
 * 
 */

define(['N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/runtime', 'N/error'],
    function(email, runtime, search, record, http, log, error) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://1048144-sb3.app.netsuite.com';
        }

        role = runtime.getCurrentUser().role;

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }

        var load_record_interval;
        var debtDataSet = JSON.parse(JSON.stringify([]));
        var invoice_id_set = JSON.parse(JSON.stringify([]));
        var debt_set = JSON.parse(JSON.stringify([]));

        function pageInit() {
            $(document).ready(function() {
                // $('#range_filter').selectpicker();
                $('#debt_preview').DataTable({
                    data: debtDataSet,
                    pageLength: 100,
                    columns: [
                        { title: 'Company Name' },
                        { title: 'Franchisee' },
                        {
                            title: 'Total Number',
                            type: 'num-fmt'
                        },
                        {
                            title: 'Total Amount',
                            type: 'num-fmt'
                        },
                        { title: 'Notes' }
                    ],
                    columnDefs: [{
                        targets: [0, 1, 2],
                        className: 'bolded'
                    }]
                });
            });

            var date_from = dateISOToNetsuite($('#date_from').val());
            var date_to = dateISOToNetsuite($('#date_to').val());
            var range = JSON.parse($('#range_filter').val());

            selectRangeOptions();
            hideLoading();

            if (!isNullorEmpty($('#period_dropdown option:selected').val())) {
                selectDate();
            }
            $('#period_dropdown').change(function() {
                selectDate()
            });

            $('#submit').click(function() {
                showResults();
                console.log('Load DataTable Params: ' + range, date_from, date_to);
                // if (!isNullorEmpty(range) && !isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
                loadDebtTable(range, date_from, date_to); //selector_id, selector_type
                // }
                // else {
                //     // error.create({
                //     //     message: 'Please Select Date Range and Date Filter',
                //     //     name: 'Invalid Data'
                //     // });
                // }
            });
        }

        function hideLoading() {
            $('#debt_preview').hide();
            $('#load_section').hide();
        }

        function showResults() {
            $('#debt_preview').show();
            $('#load_section').show();
        }

        function loadDebtTable(range, date_from, date_to) { //selector_id, selector_type
            var date_to_Filter = search.createFilter({
                name: 'trandate',
                operator: search.Operator.BEFORE,
                values: date_to
            });
            var date_from_Filter = search.createFilter({
                name: 'trandate',
                operator: search.Operator.AFTER,
                values: date_from
            });
            console.log('DATE FILTER: ' + JSON.stringify(date_to_Filter));

            // ["type", "anyof", "CustInvc"],
            // "AND", ["mainline", "is", "T"],
            // "AND", ["status", "anyof", "CustInvc:A"],
            // // "AND", ['trandate', 'within', date_from, date_to],
            // "AND", ['trandate', 'before', date_to],
            // "AND", ['trandate', 'after', date_from]
            // ["daysoverdue","lessthan","60"]

            for (var i = 0; i < range.length; i++) {
                console.log('Range ID: ' + JSON.parse(range[i]));
                var selector_id = JSON.parse(range[i]);
                if (selector_id == '1') {
                    console.log('selector_id 1 selected');
                    var myFilter1 = search.createFilter({
                        name: 'custbody_inv_type',
                        operator: search.Operator.ANYOF,
                        values: '8'
                    });
                }
                if (selector_id == '2') {
                    console.log('selector_id 2 selected');
                    var myFilter2 = search.createFilter({
                        name: 'daysoverdue',
                        operator: search.Operator.LESSTHAN,
                        values: '60'
                    });
                }
                if (selector_id == '3') {
                    console.log('selector_id 3 selected');
                    var myFilter3 = search.createFilter({
                        name: 'daysoverdue',
                        operator: search.Operator.GREATERTHAN,
                        values: '60'
                    });
                }
                console.log('Filter Contents: ' + myFilter);
            }
            var invoiceResult = search.load({
                id: 'customsearch_debt_coll_inv',
                type: 'invoice',
                // filters: [
                //     ['type', 'anyOf', 'CustInvc'],
                //     'and', ['status', 'anyof', 'CustInvc:A'],
                //     'and', date_to_Filter, date_from_Filter,
                // ]
            });
            // invoiceResult.filters.push(date_to_Filter);
            // invoiceResult.filters.push(date_from_Filter);
            if (!isNullorEmpty(myFilter1)) { invoiceResult.filters.push(myFilter1); }
            if (!isNullorEmpty(myFilter2)) { invoiceResult.filters.push(myFilter2); }
            if (!isNullorEmpty(myFilter3)) { invoiceResult.filters.push(myFilter3); }
            // var searchResult = invoiceResult.run().getRange({
            //     start: 0,
            //     end: 1000
            // });
            var searchResult = invoiceResult.run();

            if (!isNullorEmpty(range)) { //&& !isNullorEmpty(date_from) && !isNullorEmpty(date_to)
                // clearInterval(load_record_interval);
                // load_record_interval = setInterval(loadDebtRecord, 5000, date_from, date_to);
                console.log('Result Length: ' + searchResult.length);
                loadDebtRecord(searchResult, date_from, date_to);
                // console.log(load_record_interval);
            }
        }

        function loadDebtRecord(searchResult, date_from, date_to) {
            // var invoiceResults = search.load({
            //     type: 'customrecord_debt_coll_inv',
            //     id: 'customsearch_debt_coll_table'

            // });
            // // console.log(invoiceResults);
            // var invoiceResult = invoiceResults.run();
            // console.log(invoiceResult);

            // if (!isNullorEmpty(invoiceResult)) {
            //     invoiceResult.each(function(debtRecord) {
            //         // var debtRecord = invoiceResult[0];
            //         console.log(debtRecord);
            //         var debt_rows = JSON.parse(debtRecord.getValue({
            //             name: 'custrecord_debt_inv_set'
            //         }));
            //         console.log(debt_rows);
            //         loadDatatable(debt_rows);
            //     });
            // }
            // var invResultSet = invoiceSearch(date_from, date_to);

            // if (!isNullorEmpty(invResultSet)) {
            //     invResultSet.forEach(function(invoiceSet, index) {
            if (!isNullorEmpty(searchResult)) {
                searchResult.each(function(invoiceSet, index) {
                    var invoice_id = invoiceSet.getValue({
                        name: 'internalid'
                    });
                    if (invoice_id_set.indexOf(invoice_id) == -1) {
                        invoice_id_set.push(invoice_id);
                        log.debug({
                            title: 'invoiceSet',
                            details: invoiceSet
                        });

                        var customer_id = invoiceSet.getValue({
                            name: 'internalid',
                            join: 'customer'
                        });

                        var customer_name = invoiceSet.getValue({
                            name: 'companyname',
                            join: "customer"
                        });

                        var zee_name = invoiceSet.getText({
                            name: 'partner'
                        });

                        // if () {
                        var total_num = '10';
                        // }

                        var total_amount = parseFloat(invoiceSet.getValue({
                            name: 'amount'
                        }));

                        var customerSearch = record.load({
                            type: 'customer',
                            id: customer_id
                        });
                        var note = customerSearch.getValue({
                            fieldId: 'custentity4'
                        });
                        // var note = 'User Notes Information - AC 9/11/20';
                        debt_set.push({
                            inid: invoice_id_set,
                            cid: customer_id,
                            cm: customer_name,
                            zee: zee_name,
                            tn: total_num,
                            ta: total_amount,
                            nt: note
                        });

                        return true;
                    }
                });
                console.log('Data Set: ' + JSON.stringify(debt_set));
                loadDatatable(debt_set);
            } else {
                console.log('Results Empty');
            }
        }

        function loadDatatable(debt_rows) {
            $('#result_debt').empty();
            if (!isNullorEmpty(debt_rows)) {
                debt_rows.forEach(function(debt_row, index) {
                    var count = 0;
                    var customer_id = debt_row.cid;
                    console.log('Customer ID: ' + customer_id);
                    var cm_link = debt_row.cm;
                    var upload_url = baseURL + '/app/site/hosting/scriptlet.nl?script=1046&deploy=1&compid=1048144_SB3&unlayered=T&custparam_params=%7B"custid":' + customer_id + ',"scriptid":"customscript_sl_customer_list","deployid":"customdeploy_sl_customer_list"%7D';  
                    var company_name = '<a href="' + upload_url + '">' + cm_link + '</a>';
                    var zee = debt_row.zee;
                    // var tot_num = debt_row.tn;
                    // for (var i = 0; i < debt_rows.length; i++){
                    //     var customerID = debt_rows[i].cid;
                    //     if (customerID == customer_id){
                    //         count++;
                    //         console.log(count);
                    //     }
                    // }
                    var tot_num = count;
                    var tot_am = debt_row.ta;
                    var noteInfo = debt_row.nt;
                    var note_id = index;
                    var note = '<input id="note_' + note_id + '" value="' + noteInfo + '" class="form-control note_' + note_id + '"/>';
                    // var note = 'HelloWorld';
                    debtDataSet.push([company_name, zee, tot_num, tot_am, note]);
                });
            }
            // $('td[headers=""]').html(note_field);
            var datatable = $('#debt_preview').DataTable();
            datatable.clear();
            datatable.rows.add(debtDataSet);
            datatable.draw();

            $('.loading_section').addClass('hide');
            // clearInterval(load_record_interval);

            // saveCSV(debtDataSet);
            console.log('Debt DataSet: ' + debtDataSet);
            return true;
        }

        function saveRecord() {}

        function invoiceSearch(date_from, date_to) {
            var invoiceResult = search.load({
                id: 'customsearch_debt_coll_inv',
                type: 'invoice',
                filters: [
                    ["type", "anyof", "CustInvc"],
                    "AND", ["mainline", "is", "T"],
                    "AND", ["status", "anyof", "CustInvc:A"],
                    // "AND", ['trandate', 'within', date_from, date_to],
                    "AND", ['trandate', 'before', date_to],
                    "AND", ['trandate', 'after', date_from]
                ]
            });
            result = invoiceResult.run().getRange({
                start: 0,
                end: 1000
            });
            return result;
        }

        // function rangeSelection() {
        //     var range_values = $('#range_filter').val();
        //     var range_array = [];
        //     if (!isNullorEmpty(range_values)) {
        //         for (var i = 0; i < range_values.length; i++) {
        //             range_array.push($('#range_filter option:selected').val(range_value)[i].text);
        //         }
        //     }
        //     return range_array;
        // }

        /**
         * Function to select Range Options
         */
        function selectRangeOptions() {
            // var rangeArray = rangeSelection();
            var range_filter = $('#range_filter option:selected').map(function() { return $(this).val() });
            range_filter = $.makeArray(range_filter);
            $('range_filter').selectpicker('val', range_filter);
        }

        /**
         * Sets the values of `date_from` and `date_to` based on the selected option in the '#period_dropdown'.
         */
        function selectDate() {
            var period_selected = $('#period_dropdown option:selected').val();
            var today = new Date();
            var today_day_in_month = today.getDate();
            var today_day_in_week = today.getDay();
            var today_month = today.getMonth();
            var today_year = today.getFullYear();

            switch (period_selected) {
                case "this_week":

                    // This method changes the variable "today" and sets it on the previous monday
                    if (today_day_in_week == 0) {
                        var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - 6));
                    } else {
                        var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - today_day_in_week + 1));
                    }
                    var date_from = monday.toISOString().split('T')[0];
                    var date_to = '';
                    break;

                case "last_week":
                    var today_day_in_month = today.getDate();
                    var today_day_in_week = today.getDay();
                    // This method changes the variable "today" and sets it on the previous monday
                    if (today_day_in_week == 0) {
                        var previous_sunday = new Date(Date.UTC(today_year, today_month, today_day_in_month - 7));
                    } else {
                        var previous_sunday = new Date(Date.UTC(today_year, today_month, today_day_in_month - today_day_in_week));
                    }

                    var previous_sunday_year = previous_sunday.getFullYear();
                    var previous_sunday_month = previous_sunday.getMonth();
                    var previous_sunday_day_in_month = previous_sunday.getDate();

                    var monday_before_sunday = new Date(Date.UTC(previous_sunday_year, previous_sunday_month, previous_sunday_day_in_month - 6));

                    var date_from = monday_before_sunday.toISOString().split('T')[0];
                    var date_to = previous_sunday.toISOString().split('T')[0];
                    break;

                case "this_month":
                    var first_day_month = new Date(Date.UTC(today_year, today_month));
                    var date_from = first_day_month.toISOString().split('T')[0];
                    var date_to = '';
                    break;

                case "last_month":
                    var first_day_previous_month = new Date(Date.UTC(today_year, today_month - 1));
                    var last_day_previous_month = new Date(Date.UTC(today_year, today_month, 0));
                    var date_from = first_day_previous_month.toISOString().split('T')[0];
                    var date_to = last_day_previous_month.toISOString().split('T')[0];
                    break;

                case "full_year":
                    var first_day_in_year = new Date(Date.UTC(today_year, 0));
                    var date_from = first_day_in_year.toISOString().split('T')[0];
                    var date_to = '';
                    break;

                case "financial_year":
                    if (today_month >= 6) {
                        var first_july = new Date(Date.UTC(today_year, 6));
                    } else {
                        var first_july = new Date(Date.UTC(today_year - 1, 6));
                    }
                    var date_from = first_july.toISOString().split('T')[0];
                    var date_to = '';
                    break;

                default:
                    var date_from = '';
                    var date_to = '';
                    break;
            }
            $('#date_from').val(date_from);
            $('#date_to').val(date_to);
        }

        /**
         * Create the CSV and store it in the hidden field 'custpage_table_csv' as a string.
         * @param {Array} billsDataSet The `billsDataSet` created in `loadDatatable()`.
         */
        function saveCSV(debtDataSet) {
            var headers = $('#debt_preview').DataTable().columns().header().toArray().map(function(x) { return x.innerText });
            headers = headers.slice(0, headers.length - 1).join(', ');
            var csv = headers + "\n";
            debtDataSet.forEach(function(row) {
                csv += row.join(',');
                csv += "\n";
            });
            // nlapiSetFieldValue('custpage_table_csv', csv);
            return csv;
        }

        /**
         * Used to pass the values of `date_from` and `date_to` between the scripts and to Netsuite for the records and the search.
         * @param   {String} date_iso       "2020-06-01"
         * @returns {String} date_netsuite  "1/6/2020"
         */
        function dateISOToNetsuite(date_iso) {
            var date_netsuite = '';
            if (!isNullorEmpty(date_iso)) {
                var date_utc = new Date(date_iso);
                var date_netsuite = nlapiDateToString(date_utc);
            }
            return date_netsuite;
        }

        function isNullorEmpty(val) {
            if (val == '' || val == null) {
                return true;
            } else {
                return false;
            }
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord
        }
    }
);