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

                var range_id = [2];
                var date_from = '1/11/2020';
                var date_to = '30/11/2020';
                var is_params = 'T';

                // var params = context.request.parameters;
                // if (!isNullorEmpty(params)) {
                //     is_params = 'T';
                //     // params = JSON.parse(params);
                //     range_id = params.range;
                //     date_from = params.date_from;
                //     date_to = params.date_to;
                // }
                // log.debug({
                //     title: 'Parameters',
                //     details: params
                // });

                type = context.request.parameters.type;

                if (is_params == 'T') {
                    var ss_params = {
                        custscript_main_index: 0,
                        custscript_debt_inv_range: range_id,
                        custscript_debt_inv_date_from: date_from,
                        custscript_debt_inv_date_to: date_to,
                        custscript_debt_inv_invoice_id_set: JSON.stringify([])
                    };
                    var status = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: 'customscript_ss_debt_collection',
                        deploymentId: 'customdeploy_ss_debt_collection',
                        params: ss_params,
                    });
                    log.debug({
                        title: 'Scheduled script scheduled',
                        details: status
                    });
                }

                var form = ui.createForm({
                    title: 'Debt Collection'
                });

                // Load jQuery
                var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';
                // Load Tooltip
                inlineHtml += '<script src="https://unpkg.com/@popperjs/core@2"></script>';

                // Load Bootstrap
                inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
                inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';

                // Load DataTables
                inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';

                // Load Bootstrap-Select
                inlineHtml += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">';
                inlineHtml += '<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>';

                // Load Netsuite stylesheet and script
                inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
                inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
                inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
                inlineHtml += '<style>.mandatory{color:red;}</style>';


                // Load Netsuite stylesheet and script
                inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
                inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
                inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
                inlineHtml += '<style>.mandatory{color:red;}</style>';

                inlineHtml += rangeSelection();
                inlineHtml += dateFilterSection();
                // inlineHtml += loadingSection();
                inlineHtml += dataTable();
                inlineHtml += submitSection(range_id, date_from, date_to);

                // form.addButton({
                //     id: 'saveCSV',
                //     label: 'Save CSV',
                //     functionName: 'saveCSV()'
                // });

                form.addButton({
                    id: 'submit',
                    label: 'Submit Search',
                    functionName: 'submit()'
                });

                form.addField({
                    id: 'preview_table',
                    label: 'inlinehtml',
                    type: 'inlinehtml'
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.STARTROW
                }).defaultValue = inlineHtml;


                form.addField({
                    id: 'custscript_debt_inv_date_from',
                    type: ui.FieldType.TEXT,
                    label: 'Date From'
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = date_from;
                form.addField({
                    id: 'custscript_debt_inv_date_to',
                    type: ui.FieldType.TEXT,
                    label: 'Date To'
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = date_to;
                form.addField({
                    id: 'custscript_debt_inv_range',
                    type: ui.FieldType.TEXT,
                    label: 'Range ID'
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = range_id;

                form.addField({
                    id: 'custpage_customer_franchisee',
                    type: ui.FieldType.TEXT,
                    label: 'Franchisee ID'
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = zee;

                form.clientScriptFileId = 4497169; //4241008

                context.response.writePage(form);
            } else {
                var params = context.request.parameters;
                var range_id = params.range;
                var date_from = params.date_from;
                var date_to = params.date_to;

                var dc_params = {
                    custparam_zee_id: range_id,
                    custparam_date_from: date_from,
                    custparam_date_to: date_to
                }
                redirect.toSuitelet({
                    scriptId: 'customscript_sl_debt_collection',
                    deploymentId: 'customdeploy_sl_debt_collection',
                    parameters: dc_params
                });
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
            var hide_loading_section = (!isNullorEmpty(zee_id) && (!isNullorEmpty(date_from) || !isNullorEmpty(date_to))) ? '' : 'hide';
            var inlineQty = '<div id="load_section" class="form-group container loading_section' + hide_loading_section + '" style="text-align:center">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-12 loading_div">';
            inlineQty += '<h1>Loading...</h1>';
            inlineQty += '</div></div></div>';

            return inlineQty;
        }

        /**
         * Display the progress bar. Initialized at 0, with the maximum value as the number of records that will be moved.
         * Uses Bootstrap : https://www.w3schools.com/bootstrap/bootstrap_progressbars.asp
         * @param   {String}    nb_records_total    The number of records that will be moved
         * @return  {String}    inlineQty : The inline HTML string of the progress bar.
         */
        function progressBar(nb_records_total) {
            var inlineQty = '<div class="progress">';
            inlineQty += '<div class="progress-bar progress-bar-warning" id="progress-records" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="' + nb_records_total + '" style="width:0%">MPEX records moved : 0 / ' + nb_records_total + '</div>';
            inlineQty += '</div>';
            return inlineQty;
        }

        /**
         * The header showing that the results are loading.
         * @returns {String} `inlineQty`
         */
        function submitSection(range_id, date_from, date_to) {
            var hide_loading_section = (!isNullorEmpty(range_id) && (!isNullorEmpty(date_from) || !isNullorEmpty(date_to))) ? '' : 'hide';
            var inlineQty = '<div id="submit_section" class="form-group container loading_section' + hide_loading_section + '" style="text-align:center">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-12 submit_div">';
            inlineQty += '<h1>Please Submit Search</h1>';
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
            inlineQty += '<option value="1">MPEX Products</option>';
            inlineQty += '<option value="2" selected>0 - 59 Days</option>';
            inlineQty += '<option value="3">60+ Days</option>';
            inlineQty += '</select>';
            inlineQty += '</div></div>'

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

            inlineQty += periodDropdownSection();

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

        /**
         * The period dropdown field.
         * @param   {String}    date_from
         * @param   {String}    date_to
         * @return  {String}    `inlineQty`
         */
        function periodDropdownSection(date_from, date_to) {
            var selected_option = (isNullorEmpty(date_from) && isNullorEmpty(date_to)) ? 'selected' : '';
            var inlineQty = '<div class="form-group container period_dropdown_section">';
            inlineQty += '<div class="row">';
            // Period dropdown field
            inlineQty += '<div class="col-xs-12 period_dropdown_div">';
            inlineQty += '<div class="input-group">';
            inlineQty += '<span class="input-group-addon" id="period_dropdown_text">PERIOD</span>';
            inlineQty += '<select id="period_dropdown" class="form-control">';
            inlineQty += '<option></option>';
            inlineQty += '<option value="this_week">This Week</option>';
            inlineQty += '<option value="last_week">Last Week</option>';
            inlineQty += '<option value="this_month">This Month</option>';
            inlineQty += '<option value="last_month" ' + selected_option + '>Last Month</option>';
            inlineQty += '<option value="full_year">Full Year (1 Jan -)</option>';
            inlineQty += '<option value="financial_year">Financial Year (1 Jul -)</option>';
            inlineQty += '</select>';
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

        // function AddJavascript(jsname, pos) {
        //     var tag = document.getElementsByTagName(pos)[0];
        //     var addScript = document.createElement('script');
        //     addScript.setAttribute('type', 'text/javascript');
        //     addScript.setAttribute('src', jsname);
        //     tag.appendChild(addScript);
        // }

        return {
            onRequest: onRequest
        }
    }
);