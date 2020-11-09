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

define(['N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/runtime'],
    function(email, runtime, search, record, http, log) {
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
        var debtDataSet = [];

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
            // $('#selector_id').click(function(){
            //     var selector_type = $('#selector_type').val();
            //     var selector_id = $('#selector_id').val();

            // });
            loadDebtTable(); //selector_id, selector_type
            // selectRangeOptions();
        }

        function loadDebtTable() { //selector_id, selector_type
            var date_from = '31/10/2020';
            var date_to = '1/10/2020';
            var range_id = 0;

            switch (selector_type) {
                // MPEX = 0, 0-59 = 1, 60+ = 2;
                case ($('#mpex') == 'on'):
                    range_id += 1;
                    break;

                case ($('#to_59') == 'on'):
                    range_id += 2;
                    break;

                case ($('#from_60') == 'on'):
                    range_id += 3;
                    console.log(from_60);
                    break;

                default:
                    range_id = 0;
                    break;
            }
            if (range_id > 3) {
                range_id = 4;
            }


            if (!isNullorEmpty(range_id)) {
                clearInterval(load_record_interval);
                load_record_interval = setInterval(loadDebtRecord, 5000, range_id, date_from, date_to);
            }
            log.debug({
                title: 'load_record_interval',
                details: load_record_interval
            });
            // var loadSearch = loadDebtRecord(range_id, date_from, date_to);
            // console.log(loadSearch);
        }

        function loadDebtRecord(range_id, date_from, date_to) {
            // var debtSearchRecord = nlapiLoadSearch('customrecord_','customsearch_debt_coll_inv');
            var invoiceResults = search.load({
                type: 'customrecord_debt_coll_inv',
                id: 'customsearch_debt_coll_table'

            });
            console.log(invoiceResults);
            var invoiceResult = invoiceResults.run();
            console.log(invoiceResult);

            if (!isNullorEmpty(invoiceResult)) {
                invoiceResult.each(function(debtRecord) {
                    // var debtRecord = invoiceResult[0];
                    console.log(debtRecord);

                    var debt_rows = JSON.parse(debtRecord.getValue({
                        name: 'custrecord_debt_inv_set'
                    }));

                    console.log(debt_rows);
                    loadDatatable(debt_rows);
                });
            }
        }

        function loadDatatable(debt_rows) {
            $('#result_debt').empty();
            // var debt_rows = [{ "cm": "hello", "zee": "Airport West", "tn": "2", "ta": "1500", "nt": "Hello there!" }, { "cm": "Mate", "zee": "Airport North", "tn": "3", "ta": "6500", "nt": inlineQty }];
            // var debt_rows = [];

            if (!isNullorEmpty(debt_rows)) {
                debt_rows.forEach(function(debt_row, index) {
                    log.debug({
                        title: 'Customer Name',
                        details: debt_row.cm
                    });
                    var customer_id = debt_row.cid;
                    // log.debug({
                    //     title: 'Customer ID',
                    //     details: customer_id
                    // });
                    var cm_link = debt_row.cm;
                    var upload_url = baseURL + '/app/common/entity/custjob.nl?id=' + customer_id; // WORK IN PROGRESS - Sruti will give me the URL for the CUSTOMER PAGE 
                    var company_name = '<a href="' + upload_url + '">' + cm_link + '</a>';

                    var zee = debt_row.zee;
                    var tot_num = debt_row.tn;
                    var tot_am = debt_row.ta;
                    var noteInfo = debt_row.nt;
                    var note = '<input id="note">' + noteInfo + '</input>';
                    debtDataSet.push([company_name, zee, tot_num, tot_am, note]);
                });
            }

            var datatable = $('#debt_preview').DataTable();
            datatable.clear();
            datatable.rows.add(debtDataSet);
            datatable.draw();

            $('.loading_section').addClass('hide');
            clearInterval(load_record_interval);
            saveCSV(debtDataSet);

            return true;
        }

        function rangeSelection() {
            var range_values = $('#range_filter').val();
            var range_array = [];
            if (!isNullorEmpty(range_values)) {
                for (var i = 0; i < range_values.length; i++) {
                    range_array.push($('#range_filter option:selected').val(range_value)[i].text);
                }
            }
            return range_array;
        }

        /**
         * Function to select Range Options
         */
        function selectRangeOptions() {
            var rangeArray = rangeSelection();
            var range_filter = $('#range_filter option:selected').map(function() { return $(this).val() });
            range_filter = $.makeArray(range_filter);
            $('range_filter').selectpicker('val', range_filter);
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

        function isNullorEmpty(val) {
            if (val == '' || val == null) {
                return true;
            } else {
                return false;
            }
        }
        return {
            pageInit: pageInit,
            loadDatatable: loadDatatable,
            saveCSV: saveCSV
        }
    }
);