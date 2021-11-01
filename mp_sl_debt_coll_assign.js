/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * 
 * Module Description
 * 
 * NSVersion    Date                        Author         
 * 2.00         2021-09-20 09:33:08         Anesu
 *
 * Description: xxxxxxxx
 * 
 * @Last Modified by:   Anesu
 * @Last Modified time: 2021-09-20 09:33:08 
 * 
 */

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/task', 'N/format'],
    function (ui, email, runtime, search, record, http, log, redirect, task, format) {
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
            if (context.request.method === 'GET') {
                var is_params = 'T';
                type = context.request.parameters.type;

                var form = ui.createForm({ title: ' ' });

                // Load jQuery
                var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';
                // Load Tooltip
                inlineHtml += '<script src="https://unpkg.com/@popperjs/core@2"></script>';

                // Load Bootstrap
                inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
                inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';

                // Load Bootstrap-Select
                inlineHtml += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">';
                inlineHtml += '<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>';

                // Load DataTables
                inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/rowgroup/1.1.3/js/dataTables.rowGroup.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/dataTables.buttons.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/buttons.html5.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/buttons.print.min.js"></script> '

                // Load Bootstrap-Select
                inlineHtml += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">';
                inlineHtml += '<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>';

                // Load Netsuite stylesheet and script
                inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
                inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
                inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
                inlineHtml += '<style>.mandatory{color:red;}</style>';

                // New Website Color Schemes
                // Main Color: #379E8F
                // Background Color: #CFE0CE
                // Button Color: #FBEA51
                // Text Color: #103D39

                // inlineHtml += '<div class="a" style="width: 100%; background-color: #CFE0CE; padding: 20px; min-height: 100vh; height: 100%; ">'; // margin-top: -40px
                // inlineHtml += '<style>.nav > li.active > a, .nav > li.active > a:focus, .nav > li.active > a:hover { background-color: #379E8F; color: #fff }';
                // inlineHtml += '.nav > li > a, .nav > li > a:focus, .nav > li > a:hover { margin-left: 5px; margin-right: 5px; border: 2px solid #379E8F; color: #379E8F; }';
                // inlineHtml += '</style>';

                // Title
                inlineHtml += '<h1 style="font-size: 25px; font-weight: 700; color: #103D39; text-align: center">Debt Collection: Assign Customers</h1>';

                // Define alert window.
                inlineHtml += '<div class="container" style="margin-top:14px;" hidden><div id="alert" class="alert alert-danger fade in"></div></div>';

                // Define information window.
                inlineHtml += '<div class="container" hidden><p id="info" class="alert alert-info"></p></div>';

                inlineHtml += '<div style="margin-top: -40px"><br/>';

                // Buttons
                // inlineHtml += '<button style="margin-left: 10px; margin-right: 5px; background-color: #FBEA51; color: #103D39; font-weight: 700; border-color: transparent; border-width: 2px; border-radius: 15px; height: 30px" type="button" id="new_agreement" onclick="">New Franchisee Agreement</button>';


                inlineHtml += tabsSection();
                //  inlineHtml += dataTable();

                inlineHtml += '</div></div>'

                form.addField({
                    id: 'preview_table',
                    label: 'inlinehtml',
                    type: 'inlinehtml'
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.STARTROW
                }).defaultValue = inlineHtml;


                form.addField({
                    id: 'custpage_debt_inv_assign_emp_id',
                    label: 'Employee ID',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                })
                form.addField({
                    id: 'custpage_debt_inv_assign_emp_split',
                    label: 'Split',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                })
                form.addField({
                    id: 'custpage_debt_inv_assign_emp_split_id',
                    label: 'Split ID',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                })
                form.addField({
                    id: 'custpage_debt_inv_assign_count',
                    label: 'Count',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                form.addSubmitButton({
                    label: ' '
                });

                form.clientScriptFileId = 5142730; //5064221

                context.response.writePage(form);
            } else {
                var params = context.request.parameters;

                var emp_id = context.request.parameters.custpage_debt_inv_assign_emp_id // Array of Id's for Employees
                var split_bool = context.request.parameters.custpage_debt_inv_assign_emp_split
                var emp_split_id = context.request.parameters.custpage_debt_inv_assign_emp_split_id
                var count = context.request.parameters.custpage_debt_inv_assign_count;

                log.debug({
                    title: 'Submitter: Params',
                    details: params
                });
                log.debug({
                    title: 'Submitter: Params Employee ID',
                    details: params.custpage_debt_inv_assign_emp_id
                });
                log.debug({
                    title: 'Submitter: Params count',
                    details: params.custpage_debt_inv_assign_count
                });

                // CALL SCHEDULED SCRIPT
                var params2 = {
                    custscript_debt_inv_assign_emp_id: emp_id,
                    custscript_debt_inv_assign_emp_split: split_bool,
                    custscript_debt_inv_assign_emp_split_id: emp_split_id,
                    custscript_debt_inv_assign_count: count
                }
                var scriptTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: 'customscript_ss_debt_coll_assign',
                    deploymentId: 'customdeploy_ss_debt_coll_assign',
                    params: params2
                });

                var ss_id = scriptTask.submit();
                var myTaskStatus = task.checkStatus({
                    taskId: ss_id
                });
                log.audit({
                    title: 'Task Status',
                    details: myTaskStatus
                });
                log.audit({
                    title: 'Task Submit: Params',
                    details: scriptTask.params
                })
                log.audit({
                    title: 'Task Submit: Params Employee ID',
                    details: scriptTask.params.emp_id
                });

                var form = ui.createForm({
                    title: ' ',
                });

                var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';
                // Load Tooltip
                inlineHtml += '<script src="https://unpkg.com/@popperjs/core@2"></script>';

                // Load Bootstrap
                inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
                inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';

                // Load Bootstrap-Select
                inlineHtml += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">';
                inlineHtml += '<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>';

                // Load DataTables
                inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/rowgroup/1.1.3/js/dataTables.rowGroup.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/dataTables.buttons.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/buttons.html5.min.js"></script> '
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/buttons.print.min.js"></script> '

                // Load Bootstrap-Select
                inlineHtml += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">';
                inlineHtml += '<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>';

                // Load Netsuite stylesheet and script
                inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
                inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
                inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
                inlineHtml += '<style>.mandatory{color:red;}</style>';

                // Title
                inlineHtml += '<h1 style="font-size: 25px; font-weight: 700; color: #103D39; text-align: center">Debt Collection: Assign (Submitted)</h1>';

                // Define alert window.
                inlineHtml += '<div class="container" style="margin-top:14px;" hidden><div id="alert" class="alert alert-danger fade in"></div></div>';

                // Define information window.
                inlineHtml += '<div class="container" hidden><p id="info" class="alert alert-info"></p></div>';

                inlineHtml += '<div style="margin-top: -40px"><br/>';

                // inlineHtml += 
                inlineHtml += '<div class="form-group container save_record button_section">';
                inlineHtml += '<div class="row">';
                inlineHtml += '<div class="col-xs-4 col-xs-offset-4 home_btn">';
                inlineHtml += '<input type="button" style="margin-left: 10px; margin-right: 5px; margin-top: 35px; background-color: #FBEA51; color: #103D39; font-weight: 700; border-color: transparent; border-width: 2px; border-radius: 15px; height: 30px; color: #103D39;" class="form-control btn home_btn" id="home_btn" value="Go Home"></input>';
                inlineHtml += '</div></div></div>';

                inlineHtml += '</div></div>';

                form.addField({
                    id: 'preview_table',
                    label: 'inlinehtml',
                    type: 'inlinehtml'
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.STARTROW
                }).defaultValue = inlineHtml;

                form.clientScriptFileId = 5142730; //5064221

                context.response.writePage(form);

                redirect.toSuitelet({
                    scriptId: 'customscript_sl_debt_coll_assign',
                    deploymentId: 'customdeploy_sl_debt_coll_assign'
                });

            }
        }

        function tabsSection() {
            var inlineQty = '<div>';

            // Tabs headers
            inlineQty += '<style>.nav > li.active > a, .nav > li.active > a:focus, .nav > li.active > a:hover { background-color: #379E8F; color: #fff }';
            inlineQty += '.nav > li > a, .nav > li > a:focus, .nav > li > a:hover { margin-left: 5px; margin-right: 5px; border: 2px solid #379E8F; color: #379E8F; }';
            inlineQty += '</style>';

            inlineQty += '<div style="width: 95%; margin:auto; margin-bottom: 30px; margin-top: 30px;",><ul class="nav nav-pills nav-justified" style="margin:0%; ">';
            inlineQty += '<li role="presentation" class="active"><a data-toggle="tab" href="#reassign"><b>RE-ASSIGN</b></a></li>';
            inlineQty += '<li role="presentation" class=""><a data-toggle="tab" href="#split"><b>SPLIT</b></a></li>';
            // inlineQty += '<li role="presentation" class="active"><a data-toggle="tab" href="#invoices"><b>INVOICES</b></a></li>';
            inlineQty += '</ul></div>';

            // Tabs content
            inlineQty += '<div class="tab-content">';
            // if (!isFinanceRole(userRole)) {
            inlineQty += '<div role="tabpanel" class="tab-pane active" id="reassign">';
            //    inlineQty += dataTablePreview('reassign');
            inlineQty += reassign();
            inlineQty += '</div>';

            inlineQty += '<div role="tabpanel" class="tab-pane" id="split">';
            //    inlineQty += dataTablePreview('split');
            inlineQty += split();
            inlineQty += '</div>';
            // }

            inlineQty += '</div>'; //</div>

            return inlineQty;
        }



        function reassign() {
            var inlineQty = '<div class="form-group container-fluid range_filter_section">';
            inlineQty += '<div class="row">';

            inlineQty += '<div class="col-xs-5 team_section">';
            inlineQty += '<div class="input-group">';
            inlineQty += '<span class="input-group-addon" id="team_filter_text">Team Member Selection</span>';
            inlineQty += '<select multiple id="team_filter" class="form-control">';

            var employeeSearch = search.load({ type: 'employee', id: 'customsearch_debt_coll_employees' });
            // inlineQty += '<option value="" selected>- None -</option>';
            employeeSearch.run().each(function (res) {
                var em_id = res.getValue({ name: 'internalid' })
                var em_first_name = res.getValue({ name: 'firstname' });
                var em_last_name = res.getValue({ name: 'lastname' });
                inlineQty += '<option value="' + em_id + '">' + em_first_name + ' ' + em_last_name + '</option>';

                return true;
            });
            inlineQty += '</select>';
            inlineQty += '</div></div>';

            inlineQty += '<div class="col-xs-2">';
            inlineQty += '<style>.vl { height: 125px; position: absolute; left: 50%; border-width: px; border-style: solid; border-image: linear-gradient(to bottom, #103D39, rgba(0, 0, 0, 0)) 10; }</style>';
            inlineQty += '<div class="vl"></div>';
            inlineQty += '</div>'

            inlineQty += '<div class="col-xs-5 range_section">';
            inlineQty += '<div class="form-group">';

            inlineQty += '<textarea class="form-control reassignTextArea" id="reassignTextArea" rows="5" disabled></textarea>';

            inlineQty += '</div></div>';


            inlineQty += '</div>';
            inlineQty += '</div>';

            // inlineQty = '<div class="form-group container button_section">';
            // inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-4 col-xs-offset-4 send_email_btn">';
            inlineQty += '<input type="button" style="margin-left: 10px; margin-right: 5px; background-color: #FBEA51; color: #103D39; font-weight: 700; border-color: transparent; border-width: 2px; border-radius: 15px; height: 30px; color: #103D39;" class="form-control btn" id="submit_arrange" value="Submit"></input>';
            inlineQty += '</div>';
            // inlineQty += '</div>';
            // inlineQty += '</div>';


            return inlineQty;
        }

        function split() {
            var inlineQty = '<div class="form-group container-fluid range_filter_section">';
            inlineQty += '<div class="row">';

            inlineQty += '<div class="col-xs-5 split_team_section">';
            inlineQty += '<div class="input-group">';
            inlineQty += '<span class="input-group-addon" id="split_employee_filter">Employee Selection</span>';
            inlineQty += '<select id="split_team_filter" class="form-control">';

            var authSearch = search.load({ type: 'invoice', id: 'customsearch_debt_coll_assign_split' });
            authSearch.run().each(function (res) {
                var auth_id = res.getValue({ name: 'custentity_debt_coll_auth_id', join: 'customer', summary: search.Summary.GROUP });

                if (!isNullorEmpty(auth_id)) {
                    var employeeSearch = search.load({ type: 'employee', id: 'customsearch_debt_coll_employees' });
                    employeeSearch.filters.push(search.createFilter({
                        name: 'internalid',
                        operator: search.Operator.IS,
                        values: parseInt(auth_id)
                    }));
                    employeeSearch.run().each(function (res) {
                        var em_id = res.getValue({ name: 'internalid' })
                        var em_first_name = res.getValue({ name: 'firstname' });
                        var em_last_name = res.getValue({ name: 'lastname' });
                        inlineQty += '<option value="' + em_id + '">' + em_first_name + ' ' + em_last_name + '</option>';
                    });
                }

                return true;
            });
            inlineQty += '</select>';
            inlineQty += '</div></div>';

            inlineQty += '<div class="col-xs-2">';
            inlineQty += '<style>.vl { height: 125px; position: absolute; left: 50%; border-width: px; border-style: solid; border-image: linear-gradient(to bottom, #103D39, rgba(0, 0, 0, 0)) 10; }</style>';
            inlineQty += '<div class="vl"></div>';
            inlineQty += '</div>'

            inlineQty += '<div class="col-xs-5 split_team_section">';
            inlineQty += '<div class="input-group">';
            inlineQty += '<span class="input-group-addon" id="split_team_filter_text">Split List Into...</span>';
            inlineQty += '<select multiple id="split_member_filter" class="form-control">';

            var employeeSearch = search.load({ type: 'employee', id: 'customsearch_debt_coll_employees' });
            // inlineQty += '<option value="">- None -</option>';
            employeeSearch.run().each(function (res) {
                var em_id = res.getValue({ name: 'internalid' })
                var em_first_name = res.getValue({ name: 'firstname' });
                var em_last_name = res.getValue({ name: 'lastname' });
                inlineQty += '<option value="' + em_id + '">' + em_first_name + ' ' + em_last_name + '</option>';

                return true;
            });
            inlineQty += '</select>';
            inlineQty += '</div></div>';

            inlineQty += '</div>';
            inlineQty += '</div>';

            // inlineQty = '<div class="form-group container button_section">';
            // inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-4 col-xs-offset-4 send_email_btn">';
            inlineQty += '<input type="button" style="margin-left: 10px; margin-right: 5px; background-color: #FBEA51; color: #103D39; font-weight: 700; border-color: transparent; border-width: 2px; border-radius: 15px; height: 30px; color: #103D39;" class="form-control btn" id="submit_split" value="Submit"></input>';
            inlineQty += '</div>';
            // inlineQty += '</div>';
            // inlineQty += '</div>';

            return inlineQty;
        }

        /**
         * The table that will display the differents invoices linked to the franchisee and the time period.
         * @return  {String}    inlineQty
         */
        function dataTable() {
            var inlineQty = '<style>table#debt_preview {font-size: 12px;text-align: center;border: none;}.dataTables_wrapper {font-size: 14px;}table#debt_preview th{text-align: center;} .bolded{font-weight: bold;}</style>';
            inlineQty += '<table id="debt_preview" class="table table-responsive table-striped customer tablesorter hide" style="width: 100%;">';
            inlineQty += '<thead style="color: white; background-color: #379E8F;">';
            inlineQty += '<tr class="text-center">';
            inlineQty += '</tr>';
            inlineQty += '</thead>';

            inlineQty += '<tbody id="result_debt" class="result-debt"></tbody>';

            inlineQty += '</table>';
            return inlineQty;
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
                // var date_netsuite = nlapiDateToString(date_utc);
                var date_netsuite = format.format({
                    value: date_utc,
                    type: format.Type.DATE
                });
            }
            return date_netsuite;
        }

        function isNullorEmpty(strVal) {
            return (strVal == null || strVal == '' || strVal == 'null' || strVal == undefined || strVal == 'undefined' || strVal == '- None -');
        }

        return {
            onRequest: onRequest
        }
    }
);