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
            
            loadDebtTable();
        }

        function loadDebtTable(){
            var date_from = '';
            var date_to = '';
            var range_id = '';

            if (!isNullorEmpty(range_id)){
                clearInterval(load_record_interval);
                load_record_interval = setInterval(loadDebtRecord, 1000, range_id, date_from, date_to);
            }
            log.debug({
                title: 'load_record_interval',
                details: load_record_interval
            });
        }

        function loadDebtRecord(range_id, date_from, date_to){
            // var debtSearchRecord = nlapiLoadSearch('customrecord_','customsearch_debt_coll_inv');

            var invoiceResults = search.load({
                id: 'customsearch_debt_coll_inv',
                type: 'customrecord_debt_coll_inv',
                filters:
                [
                    ["type","anyof","CustInvc"], 
                    "AND", 
                    ["mainline","is","T"], 
                    "AND", 
                    ["status","anyof","CustInvc:A"],
                    ['trandate','within', date_from, date_to]
                ]
            });

            invoiceResults.run();
            var invoiceResult = invoiceResults.getResults(0, 1);

            if (!isNullorEmpty(invoiceResult)){
                var debtRecord = invoiceResult[0];

                var debt_rows = JSON.parse(debtRecord.getValue({
                    fieldId: 'custrecord_debt_inv_set'
                }));
                
                loadDatatable(debt_rows);
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
                    log.debug({
                        title: 'Customer ID',
                        details: debt_row.cid
                    });
                    var company_name = debt_row.cm;
                    var zee = debt_row.zee;
                    var tot_num = debt_row.tn;
                    var tot_am = debt_row.ta;
                    var note = debt_row.nt;
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