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

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/task'],
    function(ui, email, runtime, search, record, http, log, redirect, task) {
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

        function onRequest(context) {
            var type = 'create';
            if (context.request.method === 'GET') {
                type = context.request.parameters.type;

                var form = ui.createForm({
                    title: 'Debt Collection'
                });

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

                inlineHtml += rangeSelection();
                inlineHtml += dateFilterSection();
                inlineHtml += dataTable();
                inlineHtml += loadingSection();

                var params = context.request.parameters;
                // console.log(params);
                // if (!isNullorEmpty(params)){
                //     params = JSON.parse(params);
                //     date_from = params.date_from;
                //     date_to = params.date_to;
                // }

                var date_from = '1/10/2020';
                var date_to = '31/10/2020';

                var ss_params = {
                    // custscript_debt_inv_range: range_id,
                    custscript_debt_inv_date_from: date_from,
                    custscript_debt_inv_date_to: date_to,
                    custscript_debt_inv_debt_set: JSON.stringify([]),
                    custscript_debt_inv_invoice_id_set: JSON.stringify([])
                };

                task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: 'customscript_ss_debt_collection',
                    deploymentId: 'customdeploy_ss_debt_collection',
                    params: ss_params,
                });

                form.addButton({
                    id: 'saveCSV',
                    label: 'Save CSV',
                    functionName: 'saveCSV()'
                });

                form.addButton({
                    id: 'search',
                    label: 'Search!',
                    functionName: 'search()'
                });

                form.addField({
                    id: 'preview_table',
                    label: 'inlinehtml',
                    type: 'inlinehtml'
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.STARTROW
                }).defaultValue = inlineHtml;

                form.clientScriptFileId = 4241008;

                context.response.writePage(form);
            }
        }

        /**
         * The table that will display the differents invoices linked to the franchisee and the time period.
         * @return  {String}    inlineQty
         */
        function dataTable() {
            var inlineQty = '<style>table#debt_preview {font-size: 12px;text-align: center;border: none;}.dataTables_wrapper {font-size: 14px;}table#debt_preview th{text-align: center;} .bolded{font-weight: bold;}</style>';
            inlineQty += '<table cellpadding="15" id="debt_preview" class="table table-responsive table-striped customer tablesorter" cellspacing="0" style="width: 100%;">';
            inlineQty += '<thead style="color: white;background-color: #607799;">';
            inlineQty += '<tr class="text-center">';
            inlineQty += '</tr>';
            inlineQty += '</thead>';

            inlineQty += '<tbody id="result_debt"></tbody>';

            inlineQty += '</table>';
            return inlineQty;
        }

        /**
         * The header showing that the results are loading.
         * @returns {String} `inlineQty`
         */
        function loadingSection() {
            var inlineQty = '<div class="form-group container loading_section" style="text-align:center">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-12 loading_div">';
            inlineQty += '<h1>Loading...</h1>';
            inlineQty += '</div></div></div>';

            return inlineQty;
        }

        function rangeSelection() {
            var inlineQty = '<div class="form-group container total_amount_section">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-12 heading1"><h4><span class="label label-default col-xs-12">RANGE FILTER</span></h4></div>';
            inlineQty += '</div>';
            inlineQty += '</div>';

            inlineQty += '<div class="form-group container range_filter_section">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-12 range_section">';
            inlineQty += '<div class="input-group">';
            inlineQty += '<span class="input-group-addon" id="range_filter_text">Range Selection</span>';
            inlineQty += '<select multiple id="range_filter" class="form-control" size="3">';
            inlineQty += '<option value="1" selected>MPEX Products</option>';
            inlineQty += '<option value="2">0 - 59 Days</option>';
            inlineQty += '<option value="3">60+ Days</option>';
            inlineQty += '</select>';
            inlineQty += '</div></div>';

            // inlineQty += '<div class="col-xs-2 mpex">';
            // inlineQty += '<div class="input-group">';
            // inlineQty += '<span class="input-group-addon" id="date_to_text">MPEX Products</span>';
            // inlineQty += '<input id="mpex" type="radio" class="form-control mpex"</label><br/>';
            // inlineQty += '</div></div>';

            // inlineQty += '<div class="col-xs-2 to_59">';
            // inlineQty += '<div class="input-group">';
            // inlineQty += '<span class="input-group-addon" id="date_to_text">0 - 59 Days</span>';
            // inlineQty += '<input id="to_59" type="radio" class="form-control to_59"></label><br/>';
            // inlineQty += '</div></div>';

            // inlineQty += '<div class="col-xs-2 from_60">';
            // inlineQty += '<div class="input-group">';
            // inlineQty += '<span class="input-group-addon" id="date_to_text">60+ Days</span>';
            // inlineQty += '<input id="from_60" type="radio" class="form-control from_60"></label><br/>';
            // inlineQty += '</div></div>';

            inlineQty += '</div></div>';

            return inlineQty;
        }


        /**
         * The date input fields to filter the invoices.
         * Even if the parameters `date_from` and `date_to` are defined, they can't be initiated in the HTML code.
         * They are initiated with jQuery in the `pageInit()` function.
         * @return  {String} `inlineQty`
         */
        function dateFilterSection() {
            var inlineQty = '<div class="form-group container total_amount_section">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-12 heading1"><h4><span class="label label-default col-xs-12">DATE FILTER</span></h4></div>';
            inlineQty += '</div>';
            inlineQty += '</div>';

            inlineQty += '<div class="form-group container date_filter_section">';
            inlineQty += '<div class="row">';
            // Date from field
            inlineQty += '<div class="col-xs-6 date_from">';
            inlineQty += '<div class="input-group">';
            inlineQty += '<span class="input-group-addon" id="date_from_text">FROM</span>';
            inlineQty += '<input id="date_from" class="form-control date_from" type="date"/>';
            inlineQty += '</div></div>';
            // Date to field
            inlineQty += '<div class="col-xs-6 date_to">';
            inlineQty += '<div class="input-group">';
            inlineQty += '<span class="input-group-addon" id="date_to_text">TO</span>';
            inlineQty += '<input id="date_to" class="form-control date_to" type="date">';
            inlineQty += '</div></div></div></div>';

            return inlineQty;
        }

        function isNullorEmpty(val) {
            if (val == '' || val == null) {
                return true;
            } else {
                return false;
            }
        }

        return {
            onRequest: onRequest
        }
    }
);