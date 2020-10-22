/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * 
 * Module Description
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

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect'],
    function(ui, email, runtime, search, record, http, log, redirect) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://system.na2.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://system.sandbox.netsuite.com';
        }

        role = runtime.getCurrentUser().role;

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }

        function pageInit(){
            $(document).ready(function (){
                $('#debt-preview').DataTable({
                    data: debtDataSet,
                    pageLength: 100,
                    columns: [
                        { title: 'Company Name'},
                        { title: 'Franchisee'},
                        { 
                            title: 'Total Number',
                            type: 'num-fmt'
                        },
                        { 
                            title: 'Total Amount',
                            type: 'num-fmt'
                        },
                        { title: 'Notes'}
                    ]
                });
            });

            var debt_rows = [{"cm": "hello", "zee": "Airport West", "tn": "2", "ta": "1500", "nt": "Hello there!"}, {"cm": "Mate", "zee": "Airport North", "tn": "3", "ta": "6500", "nt": "How are you?"}]
            loadDatatable(debt_rows);
        }

        function loadDatatable(debt_rows){
            $('#result_debt').empty();
            var debtDataSet = [];

            if (!isNullorEmpty(debt_rows)){
                debt_rows.each(function(debt_row, index){
                    var company_name = debt_row.cm;
                    var zee = debt_row.zee;
                    var tot_num = debt_row.tn;
                    var tot_am = debt_row.ta;
                    var note = debt_row.nt;
                    debtDataSet.push([company_name, zee, tot_num, tot_am, note]);
                });
            }

            var datatable = $('#debt-preview').datatable().api();
            datatable.clear();
            datatable.add(debtDataSet);
            datatable.draw();

            return true;
        }

        return {
            pageInit: pageInit,
            loadDatatable: loadDatatable
        }
    }
);