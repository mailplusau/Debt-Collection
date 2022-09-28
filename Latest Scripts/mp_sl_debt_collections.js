/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * 
 * Module Description
 * 
 * NSVersion    Date                        Author         
 * 2.00         2022-07-05 09:33:08         Anesu
 *
 * Description: Automation of Debt Collection Process   
 * 
 * @Last Modified by:   Anesu
 * @Last Modified time: 2022-07-05 09:33:08 
 * 
 */

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/task', 'N/format'],
function(ui, email, runtime, search, record, http, log, redirect, task, format) {
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

            //Parameters
            var params_params = context.request.parameters;
            if (!isNullorEmpty(params_params.custparam_params)) {
                var params = JSON.parse(context.request.parameters.custparam_params);
            } else if (!isNullorEmpty(params_params.zeeid)){
                var params = context.request.parameters;
            }
            var range_selection = [];
            var team_selection = 0;
            var date_from = '';
            var date_to = '';

            if (!isNullorEmpty(params)) {
                log.debug({
                    title: 'Loaded Parameters',
                    details: params
                })
                range_selection = params.range;
                range_selection = JSON.parse(JSON.stringify(range_selection));
                log.debug({
                    title: 'Range Selection',
                    details: range_selection
                });
                team_selection = params.team
                date_from = params.date_from
                date_to = params.date_to
            } else {
                log.debug({
                    title: 'Missing Parameters',
                    details: params
                })
            }

            var form = ui.createForm({ title: ' ' }); // title: 'Debt Collection'

            // Load jQuery
            var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';
            // Load Tooltip
            inlineHtml += '<script src="https://unpkg.com/@popperjs/core@2"></script>';

            // Load Bootstrap
            inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
            inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';
            
            // Load DataTables
            inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.12.0/css/jquery.dataTables.min.css">';
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

            //Date Range Picker
            inlineHtml += '<script type="text/javascript" src="https://cdn.jsdelivr.net/momentjs/latest/moment.min.js"></script>'
            inlineHtml += '<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js"></script>'
            inlineHtml += '<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css" />'

            // New Website Color Schemes
            // Main Color: #379E8F
            // Background Color: #CFE0CE
            // Button Color: #FBEA51
            // Text Color: #103D39

            // inlineHtml += '<div class="a" style="width: 100%; background-color: #CFE0CE; padding: 20px; min-height: 100%; height: 100%;">';
            // inlineHtml += '<h1 style="text-align: center; color: #103D39; display: inline-block; font-size: 22px; font-weight: bold; line-height: 33px; vertical-align: top; margin-bottom: 4px;">Consolidation Invoice</h1>';
            inlineHtml += '<style>.nav > li.active > a, .nav > li.active > a:focus, .nav > li.active > a:hover { background-color: #379E8F; color: #fff }';
            inlineHtml += '.nav > li > a, .nav > li > a:focus, .nav > li > a:hover { margin-left: 5px; margin-right: 5px; border: 2px solid #379E8F; color: #379E8F; }';
            inlineHtml += '</style>';

            // Define alert window.
            inlineHtml += '<div class="container" style="margin-top:14px;" hidden><div id="alert" class="alert alert-danger fade in"></div></div>';

            // Define information window.
            inlineHtml += '<div class="container" hidden><p id="info" class="alert alert-info"></p></div>';
            inlineHtml += '<div style="margin-top: -40px"><br/>';

            // Popup Notes Section
            // inlineHtml += '<div id="myModal" class="modal fade bs-example-modal-sm" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel" aria-hidden="true"><div class="modal-dialog modal-sm" role="document" style="width :max-content"><div class="modal-content" style="width :max-content; max-width: 900px"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button><h4 class="modal-title panel panel-info" id="exampleModalLabel">Notes Section</h4><br> </div><div class="modal-body"></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>';
            inlineHtml += '<div id="myModal2" class="modal fade bs-example-modal-sm" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel" aria-hidden="true"><div class="modal-dialog modal-sm" role="document" style="width :max-content"><div class="modal-content" style="width :max-content; max-width: 900px"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button><h4 class="modal-title panel panel-info" id="exampleModalLabel">Snooze Timers</h4><br> </div><div class="modal-body"></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>';
            // inlineHtml += '<div id="myModal3" class="modal fade bs-example-modal-sm" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel" aria-hidden="true"><div class="modal-dialog modal-sm" role="document" style="width :max-content"><div class="modal-content" style="width :max-content; max-width: 900px"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button><h4 class="modal-title panel panel-info" id="exampleModalLabel">Assign Customer to Team Member</h4><br> </div><div class="modal-body"></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>';

            inlineHtml += '<h1 style="font-size: 25px; font-weight: 700; color: #103D39; text-align: center">Debt Collections</h1>';

            //Buttons
            inlineHtml += '<button type="button" id="submit" class="btn btn-sm submit" style="background-color: #FBEA51; color: #103D39;">Submit</button>' // margin-left: 20px;

            // Click for Instructions
            // inlineHtml += '<button type="button" class="btn btn-sm btn-info instruction_button" data-toggle="collapse" data-target="#demo" style="background-color: #FBEA51; color: #103D39; margin-left: 20px;">Click for Instructions</button><div id="demo" style="background-color: #cfeefc !important;border: 1px solid #417ed9;padding: 10px 10px 10px 20px;width:96%;position:absolute" class="collapse"><b><u>IMPORTANT INSTRUCTIONS:</u></b>';
            // inlineHtml += '<ul><li><input type="button" class="btn-xs" style="background-color: #fff; color: black;" disabled value="Submit Search" /> - <ul><li>Click "Submit Search" to load Datatable using current parameters</li></ul></li>'
            // inlineHtml += '<li>Functionalities available on the Debt Collections Table:<ul><li><b>Sort</b><ul><li>Click on column headers to sort collections invoices according to the values in the columns. This is default to "Days Overdue".</li><li>Hold "Shift" and click another column to sort according to multiple columns.</li></ul></li><li><b>Search</b><ul><li>You can search for specific Customer or Invoice by typing into the "Search" field</li></ul></li></ul></li>';
            // inlineHtml += '<li>Table Filters:<ul><li><b>Matching MAAP Allocation</b><ul><li><button type="button" class="btn-xs btn-success " disabled><span class="glyphicon glyphicon-plus"></span></button> - Click to apply MAAP Allocation filters search filters on table. ONLY click once. </li><li><button type="button" class="btn-xs btn-danger " disabled><span class="glyphicon glyphicon-minus"></span></button> - Click to remove MAAP Allocation search filter from table. This is set default to "Days Overdue".</li></ul></li> <li><b>MP Ticket Column</b><ul><button type="button" class="btn-xs btn-success" disabled><span class="glyphicon glyphicon-plus"></span></button> - Click to apply MAAP Allocation filters search filters on table. ONLY click once. </li></ul></li></ul></li><li>Clickable Actions Available Per Invoice in DataTable:</li>';
            // inlineHtml += '<ul><li><button type="button" class="btn-xs" disabled><span class="span_class glyphicon glyphicon-pencil"></span></button> - Click to open Notes Section for Selected Invoice. (Notes Section is seperate from User Notes)</li>';
            // inlineHtml += '<li><button type="button" class="btn-xs btn-secondary" disabled><span class="glyphicon glyphicon-eye-open"></span></button> - Click to Set Invoice has "Viewed" by a member of the Finance Team.</li>';
            // inlineHtml += '<li><button type="button" class="btn-xs btn-info" disabled><span class="glyphicon glyphicon-time"></span></button> - Click to view Snooze Timers</li><li><button type="button" class="timer-1day form=control btn-xs btn-info" disabled><span class="span_class">1 Day</span></button> - Click to select Snooze duration of invoice from Debt Collections Page.</li>';
            // inlineHtml += '</li></ul></div>';

            // Service Debtors Email
            inlineHtml += '<button type="button" id="redirect_serv_debt" class="btn btn-sm btn-info" style="background-color: #FBEA51; color: #103D39; margin-left: 20px;">Service Debtors Email Notifcation</button>'

            /** Start of HTML */
            inlineHtml += '<br>';
            // Only When Data Table is Loaded, These Load
            inlineHtml += parameterSelection(range_selection, team_selection);
            inlineHtml += tableFilters();
            inlineHtml += loadingSection();
            inlineHtml += dataTable();

            inlineHtml += '</div>' //</div>

            // form.addButton({
            //     id: 'submit',
            //     label: 'Submit Search'
            // });

            form.addField({
                id: 'preview_table',
                label: 'inlinehtml',
                type: 'inlinehtml'
            }).updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            }).defaultValue = inlineHtml;
            // form.addField({
            //     id: 'custpage_service_debt_cust_id',
            //     label: '',
            //     type: ui.FieldType.TEXT
            // }).updateDisplayType({
            //     displayType: ui.FieldDisplayType.HIDDEN
            // }).defaultValue = '';
            
            // Parameter
            form.addField({
                id: 'custpage_debt_coll_range_selection',
                label: 'Range Selection',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            }).defaultValue = range_selection;
            form.addField({
                id: 'custpage_debt_coll_team_selection',
                label: 'Team Selection',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            }).defaultValue = team_selection;
            form.addField({
                id: 'custpage_debt_coll_date_from',
                label: 'Date From',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            }).defaultValue = date_from;
            form.addField({
                id: 'custpage_debt_coll_date_to',
                label: 'Date To',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            }).defaultValue = date_to;

            form.addSubmitButton({
                label: ' '
            });

            form.clientScriptFileId = 5616960; //SANDBOX: 5616960 | PROD: 

            context.response.writePage(form);
        } else {
            var params = context.request.parameters;

            log.debug({
                title: 'Post: Params',
                details: params
            })
        }
    }

    /**
     * The table that will display the differents invoices linked to the franchisee and the time period.
     * @return  {String}    inlineQty
     */
    function dataTable() {
        var inlineQty = '<style>table#debt_preview {font-size: 12px;text-align: center;border: none; background-color: white;}.dataTables_wrapper {font-size: 14px;}table#debt_preview th{text-align: center;} .bolded{font-weight: bold;}</style>';

        inlineQty += '<table id="debt_preview" class="table table-responsive table-striped customer tablesorter " style="width: 100%;">'; //hide
        inlineQty += '<thead style="color: white; background-color: #379E8F;">';
        inlineQty += '<tr class="text-center">';
        inlineQty += '</tr>';
        inlineQty += '</thead>';

        inlineQty += '<tbody id="result_debt" class="result-debt"></tbody>';

        inlineQty += '</table>';
        return inlineQty;
    }

    function parameterSelection(range_selection, team_selection) {
        // Range Section
        var inlineQty = '<div class="form-group container range_filter_section_top">';
        inlineQty += '<div class="row">';
        inlineQty += '<div class="col-xs-12 heading1"><h4><span class="label label-default col-xs-12" style="background-color: #379E8F; color: white;">PARAMETERS</span></h4></div>';
        inlineQty += '</div>';
        inlineQty += '</div>';

        inlineQty += '<div class="form-group container range_filter_section">';
        inlineQty += '<div class="row">';
        inlineQty += '<div class="col-xs-6 range_section">';
        inlineQty += '<div class="input-group">';
        inlineQty += '<span class="input-group-addon" id="range_filter_text">Range Selection</span>';
        inlineQty += '<select multiple id="range_filter" class="form-control">';
        var range_obj = [
            {name: 'MPEX Products', id: '1'},
            {name: '0 - 59 Days', id: '2'},
            {name: '60+ Days', id: '3'},
            {name: '- None -', id: '0'},
        ]
        for (var i = 0; i < range_obj.length; i++){
            if (range_selection.indexOf(range_obj[i].id) != -1){
                inlineQty += '<option value="'+range_obj[i].id+'" selected>'+range_obj[i].name+'</option>';
            } else {
                inlineQty += '<option value="'+range_obj[i].id+'">'+range_obj[i].name+'</option>';
            }
        }

        inlineQty += '</select>';
        inlineQty += '</div></div>';
        // inlineQty += '</div></div>';

        // inlineQty += '<div class="form-group container team_filter_section">';
        // inlineQty += '<div class="row">';
        inlineQty += '<div class="col-xs-6 team_section">';
        inlineQty += '<div class="input-group">';
        inlineQty += '<span class="input-group-addon" id="team_filter_text">Team Member Selection</span>';
        inlineQty += '<select id="team_filter" class="form-control">';
        var team_obj = [
            {name: 'Turkan', id: '691582'},
            {name: 'Madillon', id: '1672674'},
            {name: 'Yassine', id: '755585'},
            {name: 'Test', id: '924435'},
            // {name: 'None', id: ''},
        ]
        for (var i = 0; i < team_obj.length; i++){
            if (team_selection == team_obj[i].id){
                inlineQty += '<option value="'+team_obj[i].id+'" selected>'+team_obj[i].name+'</option>';
            } else {
                inlineQty += '<option value="'+team_obj[i].id+'">'+team_obj[i].name+'</option>';
            }
        }
        inlineQty += '</select>';
        inlineQty += '</div></div>';
        inlineQty += '</div></div>';

        inlineQty += '</div></div>';

        /**
         * The date input fields to filter the invoices.
         * Even if the parameters `date_from` and `date_to` are defined, they can't be initiated in the HTML code.
         * They are initiated with jQuery in the `pageInit()` function.
         * @return  {String} `inlineQty`
         */
        inlineQty += '<div class="form-group container date_filter_section">';
        inlineQty += '<div class="row">';
        inlineQty += '<div class="col-xs-12 heading1"><h4><span class="label label-default col-xs-12" style="background-color: #379E8F; color: white;">DATE FILTER</span></h4></div>';
        inlineQty += '</div>';
        inlineQty += '</div>';

        inlineQty += periodDropdownSection();

        inlineQty += '<div class="form-group container date_filter_section">';
        inlineQty += '<div class="row">';
        // Date from field
        inlineQty += '<div class="col-xs-6 date_from">';
        inlineQty += '<div class="input-group">';
        inlineQty += '<span class="input-group-addon" id="date_from_text">From</span>';
        inlineQty += '<input id="date_from" class="form-control date_from" type="date"/>';
        inlineQty += '</div></div>';
        // Date to field
        inlineQty += '<div class="col-xs-6 date_to">';
        inlineQty += '<div class="input-group">';
        inlineQty += '<span class="input-group-addon" id="date_to_text">To</span>';
        inlineQty += '<input id="date_to" class="form-control date_to" type="date">';
        inlineQty += '</div></div></div></div>';

        return inlineQty;
    }

    /**
     * The date input fields to filter the invoices.
     * Even if the parameters `date_from` and `date_to` are defined, they can't be initiated in the HTML code.
     * They are initiated with jQuery in the `pageInit()` function.
     * @return  {String} `inlineQty`
     */
    function tableFilters(){
        var inlineQty = '<div id="table_filter_section" class="table_filters_section">';
        inlineQty += '<div class="form-group container">';
        inlineQty += '<div class="row">';
        inlineQty += '<div class="col-xs-12 heading1"><h4><span class="label label-default col-xs-12" style="background-color: #379E8F; color: white;">TABLE FILTERS</span></h4></div>';
        inlineQty += '</div>';
        inlineQty += '</div>';
        
        inlineQty += '<div class="form-group container">';
        inlineQty += '<div class="row">';

        // Child Table Buttons
        inlineQty += '<button type="button" id="btn-show-all-children" class="btn btn-sm btn-info" style="background-color: #FBEA51; color: #103D39;">Expand All</button>'
        inlineQty += '<button type="button" id="btn-hide-all-children" class="btn btn-sm btn-info" style="background-color: #FBEA51; color: #103D39; margin-left: 20px;">Collapse All</button>'

        // Toggle Table Filters
        inlineQty += '<button type="button" id="showMAAP_box" class="toggle-maap-danger btn btn-sm btn-danger" style="margin-left: 20px;">Toggle MAAP Allocation<span class="span_class glyphicon glyphicon-minus"></span></button>'
        inlineQty += '<button type="button" id="showMAAP_bank" class="toggle-maap-bank btn btn-sm btn-danger" style="margin-left: 20px;">Toggle MAAP Bank Account<span class="span_class glyphicon glyphicon-minus"></span></button>'
        inlineQty += '<button type="button" id="showMPTicket_box" class="toggle-mp-ticket btn btn-sm btn-success" style="background-color: #379E8F; margin-left: 20px;">Toggle MP Ticket Column<span class="span_class glyphicon glyphicon-plus"></span></button>';
        // Customer Start Date Range
        inlineQty += '<div class="col-xs-4 showCustStartDate">';
        inlineQty += '<div class="input-group">';
        inlineQty += '<span class="input-group-addon" id="showCustStartDate">Customer Start Date</span>';
        inlineQty += '<input type="text" id="cust_Start_date" class="form-control" name="daterange" value="Please Select Filter Range"/>'
        inlineQty += '</div></div>'; // 
        
        inlineQty += '</div></div>';

        inlineQty += '</div>';

        return inlineQty;
    }

    /**
     * The header showing that the results are loading.
     * @returns {String} `inlineQty`
     */
    function loadingSection() {
        var inlineQty = '<div class="form-group container loading_section"></div>';
        inlineQty += '<style> .loading_section { border: 14px solid #f3f3f3; border-radius: 50%; border-top: 14px solid #379E8F; width: 90px; height: 90px; -webkit-animation: spin 2s linear infinite; /* Safari */ animation: spin 2s linear infinite;';
        inlineQty += 'left: 50%; }' //position: fixed; z-index: 1000; 
            /* Safari */
        inlineQty += '@-webkit-keyframes spin {0% { -webkit-transform: rotate(0deg); } 100% { -webkit-transform: rotate(360deg); } }';

        inlineQty += '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        inlineQty += '</style>';

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
        inlineQty += '<span class="input-group-addon" id="period_dropdown_text">Period</span>';
        inlineQty += '<select id="period_dropdown" class="form-control">';
        inlineQty += '<option ' + selected_option + '></option>';
        inlineQty += '<option value="this_week">This Week</option>';
        inlineQty += '<option value="last_week">Last Week</option>';
        inlineQty += '<option value="this_month">This Month</option>';
        inlineQty += '<option value="last_month">Last Month</option>';
        inlineQty += '<option value="full_year">Full Year (1 Jan -)</option>';
        inlineQty += '<option value="financial_year">Financial Year (1 Jul -)</option>';
        inlineQty += '</select>';
        inlineQty += '</div></div></div></div>';

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