/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
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

        function onRequest(context){
            var type = 'create';
            if (context.request.method === 'GET'){
                type = context.request.paramters.type;
                
                // Load jQuery
                var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';
        
                // Load Bootstrap
                inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
                inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';
        
                // Load DataTables
                inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';
        
                // Load Netsuite stylesheet and script
                inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
                inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
                inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
                inlineHtml += '<style>.mandatory{color:red;}</style>';
        
                inlineHtml += dataTable();
                
                var form = ui.createForm({
                    title: 'Debt Collection'
                });

                form.addButton({
                    id: 'saveCSV',
                    label: 'Save CSV',
                    functionName: 'saveCSV()'
                });

                form.addField({
                    id: 'preview_table',
                    label: 'inlinehtml',
                    type: 'inlinehtml'
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.STARTROW
                }).defaultValue = inlineHtml;

                context.response.writePage(form);
            }
        }

        /**
         * The table that will display the differents invoices linked to the franchisee and the time period.
         * @return  {String}    inlineQty
         */
        function dataTable() {
            var inlineQty = '<style>table#debt-preview {font-size: 12px;text-align: center;border: none;}.dataTables_wrapper {font-size: 14px;}table#debt-preview th{text-align: center;} .bolded{font-weight: bold;}</style>';
            inlineQty += '<table cellpadding="15" id="debt-preview" class="table table-responsive table-striped customer tablesorter" cellspacing="0" style="width: 100%;">';
            inlineQty += '<thead style="color: white;background-color: #607799;">';
            inlineQty += '<tr class="text-center">';
            inlineQty += '</tr>';
            inlineQty += '</thead>';

            inlineQty += '<tbody id="result_debt"></tbody>';

            inlineQty += '</table>';
            return inlineQty;
        }

        return {
            onRequest: onRequest,
            dataTable: dataTable
        }
    }
);