/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 *
 *  * NSVersion    Date                        Author         
 *  * 2.00         2022-09-01 09:33:08         Anesu
 * 
 * Description: Debt Collection Page
 *
 * @Last Modified by: Anesu Chakaingesu
 * @Last Modified time: 2022-10-12 09:33:08 
 * 
 */

define(['N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/error', 'N/url', 'N/format', 'N/currentRecord'],
function(email, runtime, search, record, http, log, error, url, format, currentRecord) {
    var baseURL = 'https://1048144.app.netsuite.com';
    if (runtime.envType == "SANDBOX") {
        baseURL = 'https://1048144-sb3.app.netsuite.com';
    }
    // var role = runtime.getCurrentUser().role;
    var userName = runtime.getCurrentUser().name;
    var userId = runtime.getCurrentUser().id;

    // NetSuite
    var currRec = currentRecord.get();
    var ctx = runtime.getCurrentScript();

    // Parameters
    var range_selection = currRec.getValue({ fieldId: 'custpage_debt_coll_range_selection' });
    var team_selection = currRec.getValue({ fieldId: 'custpage_debt_coll_team_selection' });
    var date_from = currRec.getValue({ fieldId: 'custpage_debt_coll_date_from' });
    var date_to = currRec.getValue({ fieldId: 'custpage_debt_coll_date_to' });

    // Data
    var debtDataSet = JSON.parse(JSON.stringify([]));
    
    //Service Debtors Email Notification
    var servDebtEmailList = [];
    var seaServDebtEmail = search.load({ type: 'customrecord_serv_debt_email', id: 'customsearch_serv_debt_email' });
    seaServDebtEmail.run().each(function(res){
        var cust_id = res.getValue({ name: 'custrecord_serv_debt_email_cust_id'});
        // var auth_id = res.getValue({ name: 'custrecord_serv_debt_email_auth_id'});
        // var date = res.getValue({ name: 'custrecord_serv_debt_email_date'});
        // var note = res.getValue({ name: 'custrecord_serv_debt_email_note'});

        servDebtEmailList.push({
            custid: cust_id,
            // authid: auth_id,
            // date: date,
            // note: note
        });
        return true;
    });
    console.log(servDebtEmailList);

    // Today's Date and Defining Date
    var today = new Date();
    var today_year = today.getFullYear();
    var today_month = today.getMonth();
    var today_day = today.getDate();
    var today_date = new Date(today_year, today_month, today_day);
    today_date = today_date.toISOString().split('T')[0];
    today_date = dateISOToNetsuite(today_date);
    console.log('today_date: ' + today_date);

    // Snooze Timer Values
    var snooze_value = currRec.getValue({ fieldId: 'custpage_debt_coll_snooze_value' });
    var snooze_invoice_id = currRec.getValue({ fieldId: 'custpage_debt_coll_snooze_invoice_id' });
    var snooze_duration = currRec.getValue({ fieldId: 'custpage_debt_coll_snooze_duration' });

    /**
     * On page initialisation
     */
    function pageInit() {
        // Background-Colors
        $("#NS_MENU_ID0-item0").css("background-color", "#CFE0CE");
        $("#NS_MENU_ID0-item0 a").css("background-color", "#CFE0CE");
        $("#body").css("background-color", "#CFE0CE");

        // Hide/UnHide Elements
        $('.loading_section').hide();
        $('#table_filter_section').removeClass('hide')

        // // Hide Netsuite Submit Button
        $('#submitter').css("background-color", "#CFE0CE");
        $('#submitter').hide();
        $('#tbl_submitter').hide();
        
        /* Parameters | Filters */
        range_selection = range_selection.split("\u0005");
        $('#date_from').val(date_from);
        $('#date_to').val(date_to);
        
        // Datatable
        loadDatatable(range_selection, team_selection, date_from, date_to, userId);
        var dataTable = $('#debt_preview').DataTable({
            destroy: true,
            data: debtDataSet,
            pageLength: 100,
            lengthMenu: [10, 50, 100, 200, 500, 1000],
            order: [
                // ['3', 'asc'], // Sort By Company Name
            ],
            columns: [
                // New
                { 
                    title: 'Expand',
                    className: 'dt-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                }, // 0
                { title: "Customer ID" }, // 1
                { title: 'MAAP Bank Acc' }, // 2
                { title: "Company Name" }, // 3
                { title: "Email" }, // 4
                { title: 'Franchisee' }, // 5
                { title: "Contact Name" }, // 6
                { title: "Phone Number" }, // 7
                { title: 'Start Date'}, // 8
                { title: 'MAAP Status' }, // 9
                { title: 'Multi-Viewed'}, // 10                
                { title: 'Child Table'}, // 11
                { title: 'Inovice ID Set' }, //12
            ],
            columnDefs: [
                {
                    targets: [2, 9, 11],
                    visible: false,
                },
                {
                    targets: -1,
                    visible: false,
                    searchable: false
                },
            ],
            autoWidth: false,
            "createdRow": function(row, data) {
                if (data[10] == 'Paid') {
                    $(row).addClass('maap');
                    if ($(row).hasClass('odd')) {
                        $(row).css('background-color', 'rgba(144, 238, 144, 0.75)'); // LightGreen
                    } else {
                        $(row).css('background-color', 'rgba(152, 251, 152, 0.75)'); // YellowGreen
                    }
                }
            }
        });

        /** 
         * 
         * JQuery: Main 
         * 
        */
        /* Viewed */
        // Viewed All
        $(document).on('click', '.viewed_all', function(){
            var cust_id = $(this).attr('cust-id');
            var invoiceIdSet = ($(this).attr('invoice-set')).split(',');
            
            invoiceIdSet.forEach(function(inv_id){
                // Set All Invoice as Viewed.
                var invRecord = record.load({ type: 'invoice', id: inv_id });
                invRecord.setValue({
                    fieldId: 'custbody_invoice_viewed',
                    value: true
                });
                invRecord.save();
            })

            var tr = $(this).closest('tr');
            var row = dataTable.row(tr);
            row.child.show();
            $('.viewed_'+cust_id+'').each(function(){
                if ($(this).parent().parent().parent().hasClass('odd')) {
                    $(this).parent().parent().parent().css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light Purple
                    // $(this).parent().parent().parent().addClass('active')
                } else {
                    $(this).parent().parent().parent().css('background-color', 'rgba(153, 68, 238, 0.5)'); // Dark Purple
                    // $(this).parent().parent().parent().addClass('active')
                }
            });
            destroyChild(row);
        });
        // Viewed Single
        $(document).on('click', '.viewed_single', function(){
            var inv_id = $(this).attr('invoice-id');
            var cust_id = $(this).attr('cust-id');

            // Set invoice as Viewed.
            var invRecord = record.load({ type: 'invoice', id: inv_id });
            invRecord.setValue({
                fieldId: 'custbody_invoice_viewed',
                value: true
            });
            invRecord.save();

            $(this).addClass('active');
            if ($(this).parent().parent().parent().hasClass('odd')) {
                $(this).parent().parent().parent().css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light Purple\
            } else {
                $(this).parent().parent().parent().css('background-color', 'rgba(153, 68, 238, 0.5)'); // Dark Purple
            }
            
            // Update Main If All Viewed
            var viewed_count = 0;
            var viewed_count_total = $('.viewed_'+cust_id+'').size();
            $('.viewed_'+cust_id+'').each(function(){
                if ($(this).hasClass('active')) {
                    viewed_count++;  
                }
            });
            if (viewed_count == viewed_count_total-1) {
                if ($('.viewed_'+cust_id+'').parent().parent().parent().hasClass('odd')) {
                    $('.viewed_'+cust_id+'').parent().parent().parent().css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light Purple\
                } else {
                    $('.viewed_'+cust_id+'').parent().parent().parent().css('background-color', 'rgba(153, 68, 238, 0.5)'); // Dark Purple
                }
            }
        });

        /* Child Table */
        // Load with All Child Cells Open
        dataTable.rows().every(function() {
            this.child(createChild(this)) // Add Child Tables
            // this.child.hide(); // Hide Child Tables on Open
        });
        // Add event listener for opening and closing child table details on button.
        $('#debt_preview tbody').on('click', 'td.dt-control', function() {
            var tr = $(this).closest('tr');
            var row = dataTable.row(tr);

            if (row.child.isShown()) {
                // This row is already open - close it
                destroyChild(row);
                tr.removeClass('shown');
                tr.removeClass('parent');
            } else {
                // Open this row
                row.child.show();
                tr.addClass('shown');
                tr.addClass('parent');
            }
        });
        // Handle click on "Expand All" button
        $('#btn-show-all-children').on('click', function() {
            // Enumerate all rows
            dataTable.rows().every(function() {
                // If row has details collapsed
                if (!this.child.isShown()) {
                    // Open this row
                    this.child.show();
                    $(this.node()).addClass('shown');
                }
            });
            console.log(ctx.getRemainingUsage());
        });
        // Handle click on "Collapse All" button
        $('#btn-hide-all-children').on('click', function() {
            // Enumerate all rows
            dataTable.rows().every(function() {
                // If row has details expanded
                if (this.child.isShown()) {
                    // Collapse row details
                    this.child.hide();
                    $(this.node()).removeClass('shown');
                }
            });
        });  

        /* Parameters */
        $(document).on('click', '#submit', function(){
            var range_selection_submit = $('#range_filter').val();
            var team_selection_submit = $('#team_filter').val();
            var date_from_submit = $('#date_from').val();
            var date_to_submit = $('#date_to').val();

            var params = {
                range: range_selection_submit,
                team: team_selection_submit,
                date_from: date_from_submit,
                date_to: date_to_submit,
            } 
            params = JSON.stringify(params);
            console.log(params);
            window.location.href = baseURL + url.resolveScript({ // TEST
                deploymentId: "customdeploy_sl_debt_coll_new",
                scriptId: "customscript_sl_debt_coll_new",
            }) + "&custparam_params=" + params;
        });

        /* Table Filters Section */
        // MP Ticket Column
        $(document).on('click', '.toggle-mp-ticket', function(e) {
            $('.entityid').each(function(){
                var table = ($(this).closest('table')).DataTable();
                // ((((table.data())[0])[7]).split('<')[1]).split('>')[1] // MP Ticket of Child Table Has Value

                e.preventDefault();
                // Get the column API object
                var column = table.column(7);
                // Toggle the visibility
                column.visible(!column.visible());
                if (column.visible() == true) {
                    $('#showMPTicket_box').addClass('btn-danger');
                    $('#showMPTicket_box').removeClass('btn-success');
                    $('#showMPTicket_box').find('.span_class').addClass('glyphicon-minus');
                    $('#showMPTicket_box').find('.span_class').removeClass('glyphicon-plus');
                } else {
                    $('#showMPTicket_box').removeClass('btn-danger');
                    $('#showMPTicket_box').addClass('btn-success');
                    $('#showMPTicket_box').find('.span_class').removeClass('glyphicon-minus');
                    $('#showMPTicket_box').find('.span_class').addClass('glyphicon-plus');
                }
            });
        });
        // Matching MAAP Allocation Column
        $(document).on('click', '.toggle-maap', function(e) {
            e.preventDefault();

            // Ajax request
            var fewSeconds = 5;
            var btn = $(this);
            btn.addClass('disabled');
            setTimeout(function() {
                btn.removeClass('disabled');
            }, fewSeconds * 1000);

            if ($(this).find('btn-danger')) {
                $.fn.dataTable.ext.search.push(
                    function(settings, searchData, index, rowData, counter) {
                        if (rowData[13] == 'Not Payed') {
                            return true;
                        }
                        return false;
                    }
                );
                dataTable.draw();
            }
        });
        $(document).on('click', '.toggle-maap-danger', function(e) {
            e.preventDefault();
            $.fn.dataTable.ext.search.pop('');
            dataTable.draw();
        });
        // MAAP Bank Account Column
        $(document).on('click', '.toggle-maap-bank', function(e) {
            e.preventDefault();
            // Get the column API object
            var column = dataTable.column(2);
            // Toggle the visibility
            column.visible(!column.visible());
            $(this).toggleClass('btn-success');
            $(this).toggleClass('btn-danger');
            $(this).find('.span_class').toggleClass('glyphicon-plus');
            $(this).find('.span_class').toggleClass('glyphicon-minus');
        });
        
        /* Date Range Filter */
        $('input[name="daterange"]').daterangepicker({
            opens: 'left',
            locale: {
                format: 'DD/MM/YYYY',
                cancelLabel: 'Clear'
            }
        });
        $('input[name="daterange"]').on('apply.daterangepicker', function(ev, picker) {
            console.log("A new date selection was made: " + picker.startDate.format('YYYY-MM-DD') + ' to ' + picker.endDate.format('YYYY-MM-DD'));
            $.fn.dataTable.ext.search.pop('');
            $.fn.dataTable.ext.search.push(
                function( settings, data, dataIndex ) {
                    var min = picker.startDate.format('YYYY-MM-DD');
                    var max = picker.endDate.format('YYYY-MM-DD');
                    var date_split = data[8].split('/');
                    console.log('Date Data being pushed' + data[8])
                    if (!isNullorEmpty(data[8])){
                        var month = date_split[1];
                        if (date_split[1].length == 1){
                            month = '0' + month;
                        }
                        var days = date_split[0];
                        if (date_split[0].length == 1){
                            days = '0' + days;
                        }
                        var date = date_split[2] + '-' + month + '-' + days
                        console.log('Date Pushed' + date, 'Start Pushed' + min, 'End Pushed' + max);
                    
                        if (( min === null && max === null ) || ( min === null && date <= max ) || ( min <= date   && max === null ) || ( min <= date   && date <= max )) {
                            console.log(true);
                            return true;
                        } else {
                            // $.fn.dataTable.ext.search.pop('');
                            console.log(false);
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            );
            dataTable.draw();
        });
        $('input[name="daterange"]').on('cancel.daterangepicker', function(start, end, label) {
            $(this).val('');
            $.fn.dataTable.ext.search.pop('');
            dataTable.draw();
        });

        /* Modals: Snooze Popup */
        $(document).on('click', '.timer', function() {
            try {
                var invoiceNumber = $(this).attr('invoice-id');
                var custId = $(this).attr('cust-id');

                var header = '<div><h3 style="text-align: center;"><label class="control-label">Snooze Timers</label></h3></div>';

                var body = '<div><h4><label class="control-label">Please Select the Duration You Wish To Snooze The Customer For</label></h4></div>';

                body += '<br>'

                var bodyTimers = '<div /*class="col col-lg-12"*/ id="oldnote">';
                bodyTimers += '<div class="col-md-2"><button type="button" invoice-id="' + invoiceNumber + '" class="snooze-timer timer-1day form-control btn-xs btn-info" cust-id="'+custId+'"><span>1 Day</span></button></div>';
                bodyTimers += '<div class="col-md-2"><button type="button" invoice-id="' + invoiceNumber + '" class="snooze-timer timer-2day form-control btn-xs btn-info" cust-id="'+custId+'"><span>2 Days</span></button></div>';
                bodyTimers += '<div class="col-md-2"><button type="button" invoice-id="' + invoiceNumber + '" class="snooze-timer timer-1week form-control btn-xs btn-info" cust-id="'+custId+'"><span>1 Week</span></button></div>';
                bodyTimers += '<div class="col-md-2"><button type="button" invoice-id="' + invoiceNumber + '" class="snooze-timer timer-2week form-control btn-xs btn-info" cust-id="'+custId+'"><span>2 Weeks</span></button></div>';
                bodyTimers += '<div class="col-md-2"><button type="button" invoice-id="' + invoiceNumber + '" class="snooze-timer timer-permanent form-control btn-xs btn-info" cust-id="'+custId+'"><span>Permanent</span></button></div>';

                bodyTimers += '</div>';
                bodyTimers += '<br><br>';

                var snoozeRecord = record.load({
                    type: 'invoice',
                    id: invoiceNumber
                });
                var date = snoozeRecord.getValue({
                    fieldId: 'custbody_invoice_snooze_date'
                });
                var dateText = '';
                var bodyCurrentDate = '';
                if (!isNullorEmpty(date)) {
                    bodyCurrentDate += '<div /*class="col col-lg-12"*/ id="oldnote"><h3 style="color: rgb(50, 122, 183);">Previous Snooze Date</h3>';
                    bodyCurrentDate += '<br>';
                    bodyCurrentDate += date;
                    bodyCurrentDate += '</div>';
                }
                if (isNullorEmpty(date)) {
                    dateText = 'No Snooze Value has been Set'
                } else if (date > getDate()) {
                    dateText = 'Snooze has Expired. Please Select Snooze Amount If You Want To Snooze Customer Again'
                }
                bodyTimers += '<br>';
                bodyTimers += '<div><h4 style="text-align: center">' + dateText + '</h4></div>';

                body += bodyTimers;
                body += bodyCurrentDate;

                $('#myModal2 .modal-header').html(header);
                $('#myModal2 .modal-body').html("");
                $('#myModal2 .modal-body').html(body);
                $('#myModal2').modal("show");
            } catch (e) {
                alert('Netsuite Error Message (Contact IT if Issue Persists): ' + e)
            }
        });
        // Timer: Snooze Switch Case Button
        $(document).on('click', '.snooze-timer', function () {
            var invoiceId = $(this).attr('invoice-id');
            var custId = $(this).attr('cust-id');
            var timer = $(this).text();

            switch (timer) {
                case '1 Day':
                    var snooze_date = new Date(Date.UTC(today_year, today_month, today_day + 1));
                    snooze_date = snooze_date.toISOString().split('T')[0]; // Split Date String to get the date.
                    snooze_date = dateISOToNetsuite(snooze_date); // Convert from 2021-01-28 to 28/1/2021
                    // today_in_day = format.parse({ value: today_in_day, type: format.Type.DATE }); // Date Object
                    break;
                case '2 Days':
                    var snooze_date = new Date(Date.UTC(today_year, today_month, today_day + 2));
                    snooze_date = snooze_date.toISOString().split('T')[0];
                    snooze_date = dateISOToNetsuite(snooze_date);
                    // today_in_2day = format.parse({ value: today_in_2day, type: format.Type.DATE }); // Date Object
                    break;
                case '1 Week':
                    var snooze_date = new Date(Date.UTC(today_year, today_month, today_day + 7));
                    snooze_date = snooze_date.toISOString().split('T')[0];
                    snooze_date = dateISOToNetsuite(snooze_date);
                    // today_in_week = format.parse({ value: today_in_week, type: format.Type.DATE }); // Date Object
                    break;
                case '2 Weeks':
                    var snooze_date = new Date(Date.UTC(today_year, today_month, today_day + 14));
                    snooze_date = snooze_date.toISOString().split('T')[0];
                    snooze_date = dateISOToNetsuite(snooze_date);
                    // today_in_2week = format.parse({ value: today_in_2week, type: format.Type.DATE }); // Date Object
                    break;
                case 'Permanent':
                    var snooze_date = new Date(Date.UTC(today_year + 1, today_month, today_day));
                    snooze_date = snooze_date.toISOString().split('T')[0];
                    snooze_date = dateISOToNetsuite(snooze_date);
                    // today_in_year = format.parse({ value: today_in_year, type: format.Type.DATE }); // Date Object
                    break;
            }
            console.log(invoiceId + " " + snooze_date + " " + custId);

            $('#myModal2').modal("hide");

            // Submitter 
            snooze_duration = snooze_date;
            snooze_invoice_id = invoiceId;
            snooze_value = true;
            $('#submitter').trigger('click');
        });

        /* Period Selector */ 
        $('#period_dropdown').change(function() {
            selectDate();
        });

        /* Click for Instructions Section Collapse */
        $('.collapse').on('shown.bs.collapse', function() {
            $(".range_filter_section_top").css("padding-top", "500px");
        })
        $('.collapse').on('hide.bs.collapse', function() {
            $(".range_filter_section_top").css("padding-top", "0px");
        });

        /* Redirect Buttons */
        //Redirect: Service Debtors
        $(document).on('click', '#redirect_serv_debt', function(){
            var upload_url = baseURL + url.resolveScript({
                deploymentId: "customdeploy_sl_service_debt",
                scriptId: "customscript_sl_service_debt",
            })
            window.open(upload_url, '_blank');
        })
        
        // Bulk Update Zee Dropdown
        $('select').selectpicker();

        console.log(ctx.getRemainingUsage());
    }

    function loadDatatable(range, team_selection_id, date_from, date_to, userId){
        console.log('Load DataTable: ' + range, team_selection, date_from, date_to, userId)
        // Reformat Date
        date_from = dateISOToNetsuite(date_from);
        date_to = dateISOToNetsuite(date_to);

        var invoiceResults = search.load({
            type: 'invoice',
            id: 'customsearch_debt_coll_inv_3' //'customsearch_debt_coll_inv'
        });
        var filterExpression = []; //
        filterExpression.push(['trandate', search.Operator.WITHIN, date_from, date_to]), // Date From & Date To
        filterExpression.push("AND", ["type", search.Operator.ANYOF, "CustInvc"]); // Invoice Type
        filterExpression.push("AND", ["status",search.Operator.ANYOF,"CustInvc:A"], // Invoice Open
        "AND", 
        ["mainline",search.Operator.IS,"T"], 
        "AND", 
        ["memorized",search.Operator.IS,"F"]); // Default Search Filters
        filterExpression.push("AND", ["customer.custentity_special_customer_type",search.Operator.NONEOF,"1","3","2"]) // Not Aus Post Hub, SC or NP
        // filterExpression.push("AND", ["customer.custentity_invoice_method", search.Operator.NONEOF,"4"]); // Not MYOB Consolidation
        // Snooze Filter
        filterExpression.push("AND", ["custbody_invoice_snooze_date", search.Operator.NOTAFTER, today_date]); // Not Snoozed
        // Range Selection
        if (range.length > 0) {
            var rangeExpression = [];
            if (range.indexOf('1') != -1) {
                console.log('MPEX Products Selected');
                rangeExpression.push(['custbody_inv_type', search.Operator.ANYOF, '8']);
            }
            if (range.indexOf('2') != -1) {
                console.log('0 - 59 Days Selected');
                if (range.indexOf('1') == -1) {
                    rangeExpression.push(['daysoverdue', search.Operator.LESSTHAN, '60']);
                } else {
                    rangeExpression.push('OR', ['daysoverdue', search.Operator.LESSTHAN, '60']);
                }
            }
            if (range.indexOf('3') != -1) {
                console.log('60+ Day Selected');
                if (range.indexOf('1') == -1 && range.indexOf('2') == -1) {
                    rangeExpression.push(['daysoverdue', search.Operator.GREATERTHANOREQUALTO, '60']);
                } else {
                    rangeExpression.push('OR', ['daysoverdue', search.Operator.GREATERTHANOREQUALTO, '60']);
                }
            }
            filterExpression.push('AND', rangeExpression); //
        } else {
            console.log('No Range Filter Has Been Added')
        }
        // Allocate ID
        var teamExpression = [];
        if ((parseInt(team_selection_id) == 691582) || parseInt(team_selection_id) == 755585 || (parseInt(team_selection_id) == 924435) || parseInt(team_selection_id) == 1672674) { // Old Ones: Jassmeet 1403209 || Jori - 429450 || Azalea - 1626909 || 
            teamExpression.push(['customer.custentity_debt_coll_auth_id', search.Operator.EQUALTO, team_selection_id]) //  if (parseInt(range) == 0) { } else { teamExpression.push('AND', ['customer.custentity_debt_coll_auth_id', search.Operator.EQUALTO, auth_id]) }
        } else {
            teamExpression.push(['customer.custentity_debt_coll_auth_id', search.Operator.EQUALTO, userId]) // if (parseInt(range) == 0) { } else { teamExpression.push('AND', ['customer.custentity_debt_coll_auth_id', search.Operator.EQUALTO, userId]) }
            console.log('No Team Member Select Filter has been Added') // Don't Filter. 
        }
        filterExpression.push('AND', teamExpression);
        
        invoiceResults.filterExpression = filterExpression;
        var invSearchResLength = invoiceResults.runPaged().count;
        var invResultRun = invoiceResults.run();
        var invResultSet = [];
        for (var inv_main_index = 0; inv_main_index < 10000; inv_main_index += 1000) {
            invResultSet.push(invResultRun.getRange({ start: inv_main_index, end: inv_main_index + 999 }));
        }

        var main_index = 0;
        var prev_cust_id = [];
        var prev_comp_name = [];
        var inv_id_set = [];
        var childObject = [];
        var customerObject = [];

        for (var i = 0; i < invResultSet.length-1; i++) {
            invResultSet[i].forEach(function(invoiceSet, index){
                //Customer
                var customerId = invoiceSet.getValue({
                    name: "internalid",
                    join: "customer",
                    label: "Customer: Internal ID"
                });
                if (index == 0) {
                    prev_cust_id.push(customerId) // Push First Iteration of Customer ID.
                }
                var entityid = invoiceSet.getValue({
                    name: "entityid",
                    join: "customer",
                    label: "ID"
                })
                var companyname = invoiceSet.getValue({
                    name: "companyname",
                    join: "customer",
                    label: "Company Name"
                });
                // console.log(companyname + ' : ' + main_index + ' : ' + inv_id_set);

                var partner = invoiceSet.getText({name: "partner", label: "Franchisee"})
                var contact_name = invoiceSet.getText({
                    name: "contact",
                    join: "customer",
                    label: "Primary Contact"
                })
                var email = invoiceSet.getValue({
                    name: "email",
                    join: "customer",
                    label: "Email"
                })
                var phone_number = invoiceSet.getValue({
                    name: "phone",
                    join: "customer",
                    label: "Phone"
                });
                // var custentity_debt_coll_auth_id = invoiceSet.getValue({
                //     name: "custentity_debt_coll_auth_id",
                //     join: "customer",
                //     label: "Debt Collection - Allocated Finance Team ID"
                // });
                // Customer Start Date
                var cust_start_date = invoiceSet.getValue({
                    name: "startdate",
                    join: "customer",
                    label: "Start Date"
                });
                // Email Sent?
                var inv_email_notification = '<p>No : 0</p>';
                var servDebtEmail = servDebtEmailList.filter(function(el){ if (el.custid == customerId){ return el }});
                if (servDebtEmail.length > 0){
                    var inv_email_count = 0;
                    servDebtEmail.forEach(function(){
                        inv_email_count++;
                        return true;
                    })
                    inv_email_notification = '<p>Yes : ' + inv_email_count +'</p>';
                }
                // MAAP
                var maap_status = '';
                var client_number = invoiceSet.getValue({ name: 'custbody_maap_tclientaccount' });
                var maap_bank = invoiceSet.getValue({ name: 'custbody_maap_bankacct', label: "MAAP Bank Account" });
                console.log("Client: " + client_number + " MAAP: " + maap_bank)
                if (client_number == maap_bank){
                    maap_status = 'Paid'
                }
                
                /* Invoice */
                // Main Invoice Info
                var inv_id = invoiceSet.getValue({name: "internalid", label: "Internal ID"});
                inv_id_set.push(inv_id);
                var doc_num = invoiceSet.getValue({name: "tranid", label: "Document Number"})
                var inv_type = invoiceSet.getText({name: "custbody_inv_type", label: "Invoice Type"})
                if (isNullorEmpty(inv_type)){
                    inv_type = 'Service';
                }
                var trandate = invoiceSet.getValue({ name: "trandate", label: "Date" })
                var amount = invoiceSet.getValue({name: "amount", label: "Amount"})
                var daysoverdue = invoiceSet.getValue({name: "daysoverdue", label: "Days Overdue"})
                var days_open = invoiceSet.getValue({name: "daysopen", label: "Days Open" });
                // Secondary Info
                // var postingperiod = invoiceSet.getValue({name: "postingperiod", label: "Period"})
                var duedate = invoiceSet.getValue({name: "duedate", label: "Due Date/Receive By"})
                var custbody_mp_ticket = invoiceSet.getValue({name: "custbody_mp_ticket", label: "MP Tikcet"})
                // var custbody_invoice_snooze_date_test = invoiceSet.getValue({name: "custbody_invoice_snooze_date_test", label: "Invoice Snooze Date"})
                var custbody_invoice_viewed = invoiceSet.getValue({name: "custbody_invoice_viewed", label: "Invoice Viewed"});
                //Snooze
                if (isNullorEmpty(invoiceSet.getValue({ name: 'custbody_invoice_snooze_date' }))) {
                    var snooze = 'false';
                } else {
                    var snooze = 'true';
                }
                
                // Defining Objects for Callback
                customerObject.push({
                    internalid: customerId,
                    entityid: entityid,
                    companyname: companyname,
                    email: email,
                    franchisee: partner,
                    contact_name: contact_name,
                    phone_number: phone_number,
                    invoice_id: inv_id,
                    invoice_id_set: inv_id_set,
                    start_date: cust_start_date,
                    maap_bank: maap_bank,
                    maap_status: maap_status,
                    // last_emailed: last_emailed
                    
                });
                childObject.push({
                    custid: customerId,
                    dt: trandate,
                    ii: inv_id,
                    dn: doc_num,
                    ta: amount,
                    it: inv_type,
                    do: daysoverdue, //days_overdue
                    d_open: days_open,
                    duedate: duedate,
                    emailed: inv_email_notification,
                    mp_ticket: custbody_mp_ticket,
                    viewed: custbody_invoice_viewed,
                });
                
                if (prev_cust_id.indexOf(customerId) == -1){
                    console.log('New Customer. Save Child Object and Reset')

                    const tempChildObj = childObject[childObject.length - 1];
                    childObject.pop();

                    var tempCustObj = customerObject[customerObject.length-2];

                    var tempInvSet = inv_id_set;                    
                    if (tempInvSet.length > 0){
                        tempInvSet.pop();
                    }

                    // if (childObject.length > 0){
                        debtDataSet.push(['',
                            '<a href="' + baseURL + "/app/common/entity/custjob.nl?id=" + tempCustObj.internalid + '" target="_blank"><p class="">' + tempCustObj.entityid + '</p></a>',//Customer ID //0 
                            tempCustObj.maap_bank, // MAAP Bank Account
                            tempCustObj.companyname, // Company Name
                            tempCustObj.franchisee, // Zee
                            tempCustObj.email, // Email Address
                            tempCustObj.contact_name, // Contact Name
                            tempCustObj.phone_number, // Num
                            tempCustObj.start_date, // Customer Start Date
                            tempCustObj.maap_status, // MAAP Matching Status
                            '<div class="col-xs-auto"><button type="button" id="' + tempCustObj.invoice_id + '" cust-id="'+tempCustObj.internalid+'" invoice-set="'+tempInvSet+'" class="viewed_all viewed_'+tempCustObj.internalid+' timer_'+tempCustObj.internalid+' form-control btn-secondary"><span class="glyphicon glyphicon-eye-open"></span></button></div>', // tempCustObj.last_emailed,
                            childObject,
                            tempInvSet, //12
                        ]);
                        childObject = [tempChildObj];
                    // }

                    prev_cust_id.push(customerId);
                    inv_id_set = [inv_id];
                    
                    // prev_comp_name.push(companyname);
                }
                if (index == (invSearchResLength - 1)){
                    var tempCustObj = customerObject[customerObject.length-1];
                    debtDataSet.push(['',
                        '<a href="' + baseURL + "/app/common/entity/custjob.nl?id=" + customerId + '" target="_blank"><p class="">' + entityid + '</p></a>',//Customer ID //0 
                        maap_bank,// MAAP Bank Account Number
                        companyname,
                        partner,// franchisee,
                        email, // Address
                        contact_name,
                        phone_number,
                        cust_start_date, // Start Date
                        maap_status, // MAAP Status
                        '<div class="col-xs-auto"><button type="button" id="" cust-id="'+customerId+'" invoice-set="'+inv_id_set+'" class="viewed_all viewed_'+customerId+' timer_'+customerId+' form-control btn-secondary" ><span class="glyphicon glyphicon-eye-open"></span></button></div>',
                        childObject,
                        inv_id_set
                    ]);
                    console.log('Last Customer');
                } 
                main_index++;

                return true;
            })
        }
    }

    function saveRecord(context) {
        currRec.setValue({ fieldId: 'custpage_debt_coll_snooze_value', value: snooze_value });
        currRec.setValue({ fieldId: 'custpage_debt_coll_snooze_invoice_id', value: snooze_invoice_id });
        currRec.setValue({ fieldId: 'custpage_debt_coll_snooze_duration', value: snooze_duration });

        return true;
    }

    function createChild(row) {
        // This is the table we'll convert into a DataTable
        var table = $('<table id="debt_child_preview" class="display table-striped" width="50%" style="" />'); //font-weight: normal
        var childSet = [];
        row.data()[11].forEach(function(el) {
            if (!isNullorEmpty(el)){
                childSet.push([
                    '<a href="' + baseURL + "/app/accounting/transactions/custinvc.nl?id=" + el.ii + '" target="_blank"><p>' + el.dt + '</p></a>',
                    '<a href="' + baseURL + "/app/accounting/transactions/custinvc.nl?id=" + el.ii + '" target="_blank"><p class="entityid">' + el.dn + '</p></a>',
                    el.it,
                    '$' + el.ta,
                    el.d_open,
                    el.do, //days_overdue
                    el.duedate,
                    '<p class="mp-ticket">' + el.mp_ticket + '</p>', //
                    el.emailed,
                    '<div class="col-xs-auto"><button type="button" id="viewed_' + el.ii + '" class="viewed_single viewed_'+el.custid+' form-control btn-secondary" cust-id="'+el.custid+'" invoice-id="'+el.ii+'"><span class="glyphicon glyphicon-eye-open"></span></button></div>',//el.viewed,
                    '<div class="col-xs-auto"><button type="button" id="timer_' + el.ii + '" class="timer timer_'+el.custid+' form-control btn-info" cust-id="'+el.custid+'" invoice-id="'+el.ii+'"><span class="glyphicon glyphicon-time"></span></button></div>', //el.snooze,
                    el.viewed, //false // '<p class="viewed_value"></p>'
                ]);
            }
        });
        // Display it the child row
        row.child(table).show();

        // Initialise as a DataTable
        var usersTable = table.DataTable({
            "bPaginate": false,
            "bLengthChange": false,
            "bFilter": false,
            "bInfo": false,
            "bAutoWidth": false,
            data: childSet,
            order: [5, 'desc'], // Most to Least Overdue 
            columns: [
                { title: 'Invoice Date' }, //0
                { title: 'Document Number' }, // 1
                { title: 'Invoice Type' }, // 2
                { title: 'Total Amount' }, //3
                { title: 'Days Open' }, // 4
                { title: 'Days Overdue' }, // 5
                { title: 'Due Date'}, // 6
                { title: 'MP Ticket' }, // 7
                { title: 'Emailed?' }, // 8
                { title: 'Viewed' }, // 9
                { title: 'Snooze' }, // 10
                { title: 'Viewed: Set Value' }, //11
            ],
            columnDefs: [
                {
                    targets: [11], //7,
                    visible: false
                },
                // {
                //     targets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                //     className: 'dt-body-center'
                // }
            ],
            "createdRow": function(row, data) {
                if (data[11] == true) {
                    if ($(row).hasClass('odd')) {
                        $(row).css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light-Purple
                        $(row).addClass('showDanger')
                    } else {
                        $(row).css('background-color', 'rgba(153, 68, 238, 0.5)'); // Darker-Purple
                        $(row).addClass('showDanger')
                    }
                } else if (data[8].includes('Yes')) {
                    if ($(row).hasClass('odd')) {
                        $(row).css('background-color', 'rgba(51, 204, 255, 0.65)'); // Lighter Blue / Baby Blue
                    } else {
                        $(row).css('background-color', 'rgba(78, 175, 214, 0.75)'); // Darker Blue
                    }
                
                } else if (parseInt(data[5]) < 60 && parseInt(data[5]) > 30) {
                    if ($(row).hasClass('odd')) {
                        $(row).css('background-color', 'rgba(250, 250, 210, 1)'); // LightGoldenRodYellow
                        $(row).addClass('showWarning')
                    } else {
                        $(row).css('background-color', 'rgba(255, 255, 240, 1)'); // Ivory
                        $(row).addClass('showDanger')
                    }
                } else if (parseInt(data[5]) >= 60) {
                    if ($(row).hasClass('odd')) {
                        $(row).css('background-color', 'rgba(250, 128, 114, 0.65)'); // Salmon
                        $(row).addClass('showDanger')
                    } else {
                        $(row).css('background-color', 'rgba(255, 0, 0, 0.4)'); // Red
                        $(row).addClass('showDanger')
                    }
                } 
            }
        });
    }

    function destroyChild(row) {
        // And then hide the row
        row.child.hide();
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

        var today_date = new Date(Date.UTC(today_year, today_month, today_day_in_month))

        switch (period_selected) {
            case "this_week":
                // This method changes the variable "today" and sets it on the previous monday
                if (today_day_in_week == 0) {
                    var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - 6));
                } else {
                    var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - today_day_in_week + 1));
                }
                var date_from = monday.toISOString().split('T')[0];
                var date_to = today_date.toISOString().split('T')[0];
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
                var date_to = today_date.toISOString().split('T')[0];
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
                var date_to = today_date.toISOString().split('T')[0];
                break;

            case "financial_year":
                if (today_month >= 6) {
                    var first_july = new Date(Date.UTC(today_year, 6));
                } else {
                    var first_july = new Date(Date.UTC(today_year - 1, 6));
                }
                var date_from = first_july.toISOString().split('T')[0];
                var date_to = today_date.toISOString().split('T')[0];
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
     * Function to select Range Options
     */
    function selectOptions() {
        var range_filter = $('#range_filter option:selected').map(function() { return $(this).val() });
        range_filter = $.makeArray(range_filter);
        $('#range_filter').selectpicker('val', range_filter);
        var team_filter = $('#team_filter option:selected').map(function() { return $(this).val() });
        team_filter = $.makeArray(team_filter);
        $('#team_filter').selectpicker('val', team_filter);
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

    /**
     * [getDate description] - Get the current date
     * @return {[String]} [description] - return the string date
     */
    function getDate() {
        var date = new Date();
        date = format.format({
            value: date,
            type: format.Type.DATE,
            timezone: format.Timezone.AUSTRALIA_SYDNEY
        });

        return date;
    }

    function isNullorEmpty(strVal) {
        return (strVal == null || strVal == '' || strVal == 'null' || strVal == undefined || strVal == 'undefined' || strVal == '- None -');
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
    };
});