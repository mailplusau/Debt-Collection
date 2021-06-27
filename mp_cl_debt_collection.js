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
 * @Last Modified time: 2020-11-217 16:49:26
 * 
 */

define(['N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/error', 'N/url', 'N/format', 'N/currentRecord'],
    function(email, runtime, search, record, http, log, error, url, format, currentRecord) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://1048144-sb3.app.netsuite.com';
        }

        role = runtime.getCurrentUser().role;
        var userName = runtime.getCurrentUser().name;
        var userId = runtime.getCurrentUser().id;
        var currRec = currentRecord.get();

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }

        var debtDataSet = JSON.parse(JSON.stringify([]));
        var debt_set = JSON.parse(JSON.stringify([]));

        function pageLoad(){
            $('.range_filter_section').addClass('hide');
            $('.range_filter_section_top').addClass('hide');
            $('.date_filter_section').addClass('hide');
            $('.period_dropdown_section').addClass('hide');

            $('.loading_section').removeClass('hide');
        }

        function beforeSubmit(){
            $('#debt_preview').hide();
            $('#debt_preview').addClass('hide');

            $('.loading_section').removeClass('hide');
        }

        function duringSubmit(){
            // $('.loading_section').addClass('hide');
        }

        function afterSubmit(){
            $('.range_filter_section').removeClass('hide');
            $('.range_filter_section_top').removeClass('hide');
            $('.date_filter_section').removeClass('hide');
            $('.period_dropdown_section').removeClass('hide');

            $('.loading_section').addClass('hide');

            $('#table_filter_section').removeClass('hide');
            $('#table_filter_section').show();

            if (!isNullorEmpty($('#result_debt').val())){
                $('#debt_preview').removeClass('hide');
                $('#debt_preview').show();
            }

            $('#result_debt').on('change', function(){
                $('#debt_preview').removeClass('hide');
                $('#debt_preview').show();
            });

            $('#debt_preview').removeClass('hide');
            $('#debt_preview').show();
        }

        function pageInit() {    
            //background-colors
            $("#NS_MENU_ID0-item0").css("background-color", "#CFE0CE");
            $("#NS_MENU_ID0-item0 a").css("background-color", "#CFE0CE");
            $("#body").css("background-color", "#CFE0CE");

            selectRangeOptions();       
     
            debtDataSet = [];
            debt_set = [];

            if (!isNullorEmpty($('#period_dropdown option:selected').val())) {
                selectDate();
            }
            $('#period_dropdown').change(function() {
                selectDate();
            });

            /** 
             *  Submit Button Function
             */
            $('#submit').click(function() {
                // Ajax request
                var fewSeconds = 10;
                var btn = $(this);
                btn.addClass('disabled');
                // btn.addClass('')
                setTimeout(function(){
                    btn.removeClass('disabled');
                }, fewSeconds*1000);

                debtDataSet = [];
                debt_set = [];

                beforeSubmit();
                submitSearch();

                return true;
            });

            /**
             *  Save Preferences for Users
             */
            $(document).ready(function(){
                console.log('ID: ' + userName);
                log.audit({
                    title: 'User Whos Using It',
                    details: userName
                })
                var prefSearch = search.load({
                    type: 'customrecord_debt_coll_pref',
                    id: 'customsearch_debt_coll_pref'
                });
                prefSearch.filters.push(search.createFilter({
                    name: 'name',
                    operator: search.Operator.IS,
                    values: userId
                }));
                prefSearch.run().each(function(pref){
                    var internalID = pref.getValue({
                        name: 'internalid'
                    });
                    var prefRecord = record.load({
                        type: 'customrecord_debt_coll_pref',
                        id: internalID
                    });
                    var range_id = prefRecord.getValue({
                        fieldId: 'custrecord_pref_range_id',
                    });
                    range_id = range_id.split(',');
                    console.log('Saved Reange ID: ' + range_id)
                    var date_from = prefRecord.getValue({
                        fieldId: 'custrecord_pref_date_from'
                    });
                    var date_to =  prefRecord.getValue({
                        fieldId: 'custrecord_pref_date_to'
                    });
                    range_id = $('#range_filter').val(range_id);
                    selectRangeOptions();
                    date_from = $('#date_from').val(date_from);
                    date_to = $('#date_to').val(date_to);
                });
            });

            /**
             *  Auto Load Submit Search and Load Results on Page Initialisation
             */
             $('#loading_section').hide();
            pageLoad();
            submitSearch();  
            var dataTable = $('#debt_preview').DataTable();          

            /**
             *  Viewed Invoices by Finance Team 
             */
            $(document).on('click', '.eye', function() {
                try{
                    var tr = $(this).closest('tr');
                    var row = dataTable.row(tr);
                    console.log(row.data());
                    var index = row.data();

                    var invoiceNumber = (index[1].split('id=')[1]).split('"')[0];
                    console.log("Invoice Number: " + invoiceNumber);

                    var snoozeInvoice = record.load({
                        type: 'customrecord_debt_coll_inv',
                        id: index[16]
                    });
                    // var viewed = snoozeInvoice.getValue({
                    //     fieldId: 'custrecord_debt_coll_viewed'
                    // });
                    // console.log('Viewed? ' + viewed);
                    snoozeInvoice.setValue({
                        fieldId: 'custrecord_debt_coll_viewed',
                        value: true
                    });
                    snoozeInvoice.save();   

                    if ($(tr).hasClass('odd')) {
                        $(tr).css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light Purple\
                        $(tr).addClass('thisWorked');
                    } else {
                        $(tr).css('background-color', 'rgba(153, 68, 238, 0.5)'); // Dark Purple
                        $(tr).addClass('thisWorked');
                    }

                    window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + getDate() + '&viewed=true' + '&recordid=' + index[16],
                    '_blank'
                    );
                } catch (e){
                    alert('Netsuite Error Message (Contact IT if Issue Persists): ' + e)
                }
            });
            $(document).on('click', '.eyeplus', function() {
                try{
                    var tr = $(this).closest('tr');
                    var row = dataTable.row(tr);
                    console.log(row.data());
                    var index = row.data();

                    if ($(tr).hasClass('odd')) {
                        $(tr).css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light Purple\
                        $(tr).addClass('thisWorked');
                    } else {
                        $(tr).css('background-color', 'rgba(153, 68, 238, 0.5)'); // Dark Purple
                        $(tr).addClass('thisWorked');
                    }

                    var snoozeInvoice = record.load({
                        type: 'customrecord_debt_coll_inv',
                        id: index[16]
                    });
                    snoozeInvoice.setValue({
                        fieldId: 'custrecord_debt_coll_viewed',
                        value: true
                    });
                    snoozeInvoice.save(); 

                    var invoiceNumber = (index[1].split('id=')[1]).split('"')[0];
                    console.log("Invoice Number: " + invoiceNumber);

                    window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + index[0] + '&multiviewed=true' + '&recordid=' + index[16] + '&custid=' + index[14],
                    '_blank'
                    );
                } catch (e){
                    alert('Netsuite Error Message (Contact IT If Issue Persists): ' + e)
                }
            });


                /**
                 *  Notes Section
                 */
                // More Notes Option
                $(document).on('click', '.note', function(){
                    try{
                    var tr = $(this).closest('tr');
                    var row = dataTable.row(tr);
                    console.log(row.data());
                    var index = row.data();

                    var invoiceNumber = (index[1].split('id=')[1]).split('"')[0];
                    console.log("Invoice Number: " + invoiceNumber);
                    var custid = index[14];
                    var recordID = index[16]

                    var viewedRecord = record.load({
                        type: 'invoice',
                        id: invoiceNumber
                    });
                    var viewed = viewedRecord.getValue({
                        fieldId: 'custbody_invoice_viewed'
                    });
                    console.log('Invoice Viewed? ' + viewed);

                    var header = '<div><h3><label class="control-label" style="width: 500px;text-align: center;">Notes Section</label></h3></div>';
                    var body = '';
                    
                    var bodyNoteOld = '<div /*class="col col-lg-12"*/ id="oldnote"><h3 style="color: rgb(50, 122, 183);">Created By</h3>';
                    var bodyNoteEdit = '<div /*class="col-lg-12"*/ id="newnote"><h3 style="color: rgb(50, 122, 183);">Last Edited By</h3>';
                    var bodyAuthor = '<div /*class="col-lg-12"*/ id="authornote"><h3 style="color: rgb(50, 122, 183);">Author</h3>';

                    console.log('Inside Second');
                    // console.log('Old Notes Info: ' + oldNote);

                    // var initials = userName.split(' ').map(function (n) {return n[0]}).join(".");
                    // var newNote = initials + ' - ' + date + ': ';
                    // var initialNote = author + ' - ' + date + ': ';
                    // var newNote = author + ' - ' + date + ': ' + noteVal;

                    var noteVal = '';
                    var noteSearch = search.load({
                        id: 'customsearch_debt_coll_user_note',
                        type: 'customrecord_debt_coll_user_note'
                    })
                    noteSearch.filters.push(search.createFilter({
                        name: 'name',
                        operator: search.Operator.CONTAINS,
                        values: invoiceNumber
                    }));
                    noteSearch.run().each(function(res){
                        noteVal += res.getValue({ name: 'custrecord_debt_coll_note'});
                        date = res.getValue({ name: 'custrecord_debt_coll_note_date'})
                        author = res.getValue({ name: 'custrecord_debt_coll_note_author'});
                        
                        var editAuthor = (noteVal.split("-"))[0];
                        bodyNoteEdit += '<h4>' + editAuthor + '</h4>';
                        bodyAuthor += '<h4>' + author + '</h4>';
                        
                        bodyNoteOld += '<textarea id="note_id_' + invoiceNumber + '" class="form-control note_old" style="width: 500px; ">' + noteVal + '</textarea>'; //+ newNote +
                                
                        bodyNoteOld += '</div>';
                        bodyNoteEdit += '</div>'; 

                    });

                    bodyNoteOld += '<br>';
                    bodyNoteEdit += '<br>';
                    bodyAuthor += '<br>';

                    var note = '<div /*class="col-lg-12"*/ id="newnote"><h3 style="color: rgb(50, 122, 183);">New User Note</h3>';
                    note += '<div class="col-xs-12"><div class="col-xs-11"><input id="note_' + invoiceNumber + '" class="form-control note_section"></input></div>'; 
                    note += '<div class="col-xs-1"><button type="button" id="tickbox_' + invoiceNumber + '" class="tickbox form=control btn-xs btn-warning" custid="'+ custid +'" record="'+ recordID +'" ><span class="span_class glyphicon glyphicon-plus"></span></button></div></div>';
                    note += '<br><br>';

                    body += bodyAuthor;
                    body += bodyNoteEdit;
                    body += bodyNoteOld;
                    body += note;

                    $('#myModal .modal-header').html(header);
                    $('#myModal .modal-body').html("");
                    $('#myModal .modal-body').html(body);
                    $('#myModal').modal("show");
                } catch (e){
                    alert('Netsuite Error Message (Contact IT if Issue Persists): ' + e)
                }
            })

            // Notes Input and Submit
            $(document).on('click', '.tickbox', function() {
                // var tr = $(this).closest('tr');
                // var row = dataTable.row(tr);
                // var index = row.data();
                // var custid = (index[14]);
                // var recordID = index[16];
                var invoiceNumber = ($(this).attr('id')).split('_')[1];
                var noteVal = $('#note_' + invoiceNumber).val();
                console.log("Note Value: " + noteVal);
                
                // var invoiceNumber = $(this).attr('id');
                var recordID = $(this).attr('record');
                var custid = $(this).attr('custid');

                if (!isNullorEmpty(noteVal)){
                    if ($(this).find('btn-warning')){
                        // If Closed
                        $(this).addClass('btn-success');
                        $(this).removeClass('btn-warning');
                        $(this).find('.span_class').addClass('glyphicon-ok');
                        $(this).find('.span_class').removeClass('glyphicon-plus');
                        
                        // $('#eye_more_' + invoiceNumber + '').removeAttr('disabled');
                    } else {
                        // If Opened
                        $(this).removeClass('btn-success');
                        $(this).addClass('btn-warning');
                        $(this).find('.span_class').removeClass('glyphicon-ok');
                        $(this).find('.span_class').addClass('glyphicon-plus');
                    }

                    onclick_noteSection(custid, noteVal, invoiceNumber, recordID);

                } else {
                    console.log('Notes Section - ID: ' + index[14] + '. Message missing');
                    error.create({
                        message: 'Notes Section Empty. Please fill this before submitting',
                        name: 'Error - notes',
                        notifyOff: false
                    });
                    alert('Notes Section Empty. Please fill this before submitting');
                }
            }); 

            /**
             *  Snooze Button
             */
            $(document).on('click', '.timer', function(){
                var tr = $(this).closest('tr');
                var row = dataTable.row(tr);
                var index = row.data();
                var invoiceNumber = (index[1].split('id=')[1]).split('"')[0];
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = index[16];

                var header = '<div><h3 style="text-align: center;"><label class="control-label">Snooze Timers</label></h3></div>';
                
                var body = '<div><h4><label class="control-label">Please Select the Duration You Wish To Snooze The Customer For</label></h4></div>';

                body += '<br>'

                var bodyTimers = '<div /*class="col col-lg-12"*/ id="oldnote">';
                bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-1day form=control btn-xs btn-info" record="' + recordID +'"><span class="span_class">1 Day</span></button></div>';
                bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-2day form=control btn-xs btn-info" record="' + recordID +'"><span class="span_class">2 Days</span></button></div>';
                bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-1week form=control btn-xs btn-info" record="' + recordID +'"><span class="span_class">1 Week</span></button></div>';
                bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-2week form=control btn-xs btn-info" record="' + recordID +'"><span class="span_class">2 Weeks</span></button></div>';
                bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-permanent form=control btn-xs btn-info" record="' + recordID +'"><span class="span_class">Permanent</span></button></div>';

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
                if (!isNullorEmpty(date)){
                    bodyCurrentDate += '<div /*class="col col-lg-12"*/ id="oldnote"><h3 style="color: rgb(50, 122, 183);">Previous Snooze Date</h3>';
                    bodyCurrentDate += '<br>';
                    bodyCurrentDate += date;
                    bodyCurrentDate += '</div>';
                }
                if (isNullorEmpty(date)){
                    dateText = 'No Snooze Value has been Set'
                } else if(date > getDate()){
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
            });

            var today = new Date();
            var today_year = today.getFullYear();
            var today_month = today.getMonth();
            var today_day = today.getDate();

            var today_in_day  = new Date(Date.UTC(today_year, today_month, today_day + 1));
            today_in_day = today_in_day.toISOString().split('T')[0]; // Split Date String to get the date.
            today_in_day = dateISOToNetsuite(today_in_day); // Convert from 2021-01-28 to 28/1/2021
            today_in_day = format.parse({ value: today_in_day, type: format.Type.DATE }); // Date Object
            // console.log('Today Format Netsuite ' + today_in_day)

            var today_in_2day  = new Date(Date.UTC(today_year, today_month, today_day + 2));
            today_in_2day = today_in_2day.toISOString().split('T')[0];
            today_in_2day = dateISOToNetsuite(today_in_2day);
            today_in_2day = format.parse({ value: today_in_2day, type: format.Type.DATE }); // Date Object

            var today_in_week  = new Date(Date.UTC(today_year, today_month, today_day + 7));
            today_in_week = today_in_week.toISOString().split('T')[0];
            today_in_week = dateISOToNetsuite(today_in_week);
            today_in_week = format.parse({ value: today_in_week, type: format.Type.DATE }); // Date Object

            var today_in_2week  = new Date(Date.UTC(today_year, today_month, today_day + 14));
            today_in_2week = today_in_2week.toISOString().split('T')[0];
            today_in_2week = dateISOToNetsuite(today_in_2week);
            today_in_2week = format.parse({ value: today_in_2week, type: format.Type.DATE }); // Date Object

            $(document).on('click', '.timer-1day', function(){
                var invoiceNumber = $(this).attr('id');
                var recordID = $(this).attr('record');
                console.log("Invoice Number: " + invoiceNumber);

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + today_in_day + '&period=1day' + '&recordid=' + recordID,
                '_blank'
                );
            });

            $(document).on('click', '.timer-2day', function(){
                var invoiceNumber = $(this).attr('id');
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = $(this).attr('record');

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + today_in_2day + '&period=2day' + '&recordid=' + recordID,
                '_blank'
                );
                
            });
            $(document).on('click', '.timer-1week', function(){
                var invoiceNumber = $(this).attr('id');
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = $(this).attr('record');

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + today_in_week + '&period=2day' + '&recordid=' + recordID,
                '_blank'
                );
            });
            $(document).on('click', '.timer-2week', function(){
                var invoiceNumber = $(this).attr('id');
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = $(this).attr('record');

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + today_in_2week + '&period=2week' + '&recordid=' + recordID,
                '_blank'
                );
            });
            $(document).on('click', '.timer-permanent', function(){
                var invoiceNumber = $(this).attr('id');
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = $(this).attr('record');

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=permanent&period=permanent' + '&recordid=' + recordID,
                '_blank'
                );
            });

            /** 
             * Table Filters Section
             */
            // MP Ticket Column
            $(document).on('click', '.toggle-mp-ticket', function (e){
                e.preventDefault();
                // Get the column API object
                var column = dataTable.column(10);
                // Toggle the visibility
                column.visible(!column.visible());
                if (column.visible() == true){
                    $(this).addClass('btn-danger');
                    $(this).removeClass('btn-success');
                    $(this).find('.span_class').addClass('glyphicon-minus');
                    $(this).find('.span_class').removeClass('glyphicon-plus');
                } else {
                    $(this).removeClass('btn-danger');
                    $(this).addClass('btn-success');
                    $(this).find('.span_class').removeClass('glyphicon-minus');
                    $(this).find('.span_class').addClass('glyphicon-plus');
                }
            });

            // Matching MAAP Allocation Column
            $(document).on('click', '.toggle-maap', function (e){
                e.preventDefault();

                // Ajax request
                var fewSeconds = 5;
                var btn = $(this);
                btn.addClass('disabled');
                setTimeout(function(){
                    btn.removeClass('disabled');
                }, fewSeconds*1000);
                
                if ($(this).find('btn-danger')){
                    $.fn.dataTable.ext.search.push(
                        function(settings, searchData, index, rowData, counter) {
                            if (rowData[13] == 'Not Payed'){
                                return true;
                            }
                            return false;
                        }
                    );  
                    dataTable.draw();
                }
            });
            $(document).on('click', '.toggle-maap-danger', function (e){
                e.preventDefault();
                $.fn.dataTable.ext.search.pop('');
                dataTable.draw();
            });

            // MAAP Bank Account Column
            $(document).on('click', '.toggle-maap-bank', function (e){
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

            /**
             *  Click for Instructions Section Collapse
             */
            $('.collapse').on('shown.bs.collapse', function() {
                $(".range_filter_section_top").css("padding-top","500px");
            })
            $('.collapse').on('hide.bs.collapse', function() {
                $(".range_filter_section_top").css("padding-top","0px");
            })
        }

        function submitSearch(){
            // duringSubmit();

            datatable = $('#debt_preview').DataTable({
                destroy: true,
                data: debtDataSet,
                pageLength: 1000,
                order: [[8, 'asc']],
                columns: [
                    { title: 'Date' }, //0
                    { title: 'Invoice Number' }, // 1
                    { title: 'MAAP Bank Account'}, // 2
                    { title: 'Company Name' }, // 3
                    { title: 'Franchisee' }, // 4
                    {
                        title: 'Total Number of Invoices',
                        type: 'num-fmt'
                    }, // 5
                    {
                        title: 'Invoice Amount',
                        type: 'num-fmt'
                    }, // 6
                    {
                        title: 'Due Date',
                        type: 'num-fmt'
                    }, // 7
                    {
                        title: 'Days Overdue',
                        type: 'num-fmt'
                    }, // 8
                    { title: 'Period' }, // 9
                    { title: 'MP Ticket' }, // 10
                    { title: 'Notes | Viewed' }, // 11
                    { title: 'Multi-Viewed | Snooze' }, // 12
                    { title: 'MAAP Payment Status'} // 13
                    // 14 - Customer ID
                    // 15 - Tick Status / This is for the added notes section. Redundent
                    // 16 - Record ID
                    // 17 - Notes
                    // 18 - Viewed
                ],
                columnDefs: [{
                        targets: [1, 5, 6, 7],
                        className: 'bolded'
                    },
                    {
                        width: '4%',
                        targets: [5, 6, 7, 8, 9]
                    },
                    {
                        width: '25%',
                        targets: [3]
                    },
                    {
                        width: '10%',
                        targets: [4, 11, 12]
                    },
                    {
                        targets: [10, 13, 14, 15, 16, 17, 18],
                        visible: false
                    },
                    {
                        targets: -1,
                        visible: false,
                        searchable: false
                    },
                ],
                autoWidth: false,
                rowCallback: function(row, data) {
                    // $('td:eq(1)', row).html;                    
                    if (data[18] == true){
                        if ($(row).hasClass('odd')) {
                            $(row).css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light-Purple
                            $(row).addClass('showDanger')
                        } else {
                            $(row).css('background-color', 'rgba(153, 68, 238, 0.5)'); // Darker-Purple
                            $(row).addClass('showDanger')
                        }
                    } else if (data[13] == 'Payed') {
                        $(row).addClass('maap');
                        if ($(row).hasClass('odd')) {
                            $(row).css('background-color', 'rgba(144, 238, 144, 0.75)'); // LightGreen
                        } else {
                            $(row).css('background-color', 'rgba(152, 251, 152, 0.75)'); // YellowGreen
                        }
                    } else if (parseInt(data[8]) < 60 && parseInt(data[7]) > 30) {
                        if ($(row).hasClass('odd')) {
                            $(row).css('background-color', 'rgba(250, 250, 210, 1)'); // LightGoldenRodYellow
                            $(row).addClass('showWarning')
                        } else {
                            $(row).css('background-color', 'rgba(255, 255, 240, 1)'); // Ivory
                            $(row).addClass('showDanger')
                        }
                    } else if (parseInt(data[8]) >= 60) {
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
            
            var range = $('#range_filter').val();
            var date_from = $('#date_from').val();
            var date_to = $('#date_to').val();
            date_from = dateISOToNetsuite(date_from);
            date_to = dateISOToNetsuite(date_to);
            
            console.log('Load DataTable Params: ' + range + ' | ' + date_from + ' | ' + date_to);

            if (!isNullorEmpty(range) || !isNullorEmpty(date_from) || !isNullorEmpty(date_to)) {
                loadDebtRecord(range, date_from, date_to);
            } else {
                error.create({
                    message: 'Please Select Date Range and Date Filter',
                    name: 'Invalid Data'
                });
                alert('Please Select Date Range and Date Filter');
            }
            console.log('Loaded Results');

            var prefSearch = search.load({
                type: 'customrecord_debt_coll_pref',
                id: 'customsearch_debt_coll_pref'
            });
            prefSearch.filters.push(search.createFilter({
                name: 'name',
                operator: search.Operator.IS,
                values: userId
            }));
            var prefResult = prefSearch.run();
            var prefCount = prefSearch.runPaged().count;
            
            if (prefCount == 0) {
                var prefRec = record.create({
                    type: 'customrecord_debt_coll_pref'
                });
                prefRec.setValue({
                    fieldId: 'name',
                    value: userId
                });
                prefRec.setValue({
                    fieldId: 'custrecord_pref_author',
                    value: userName
                });
                prefRec.setValue({
                    fieldId: 'custrecord_pref_range_id',
                    value: range
                });
                prefRec.setValue({
                    fieldId: 'custrecord_pref_date_from',
                    value: $('#date_from').val()
                });
                prefRec.setValue({
                    fieldId: 'custrecord_pref_date_to',
                    value: $('#date_to').val()
                });
                var prefRecId = prefRec.save();
                console.log('New Record Created For New User :' + prefRec);
            } else {
                prefResult.each(function(pref){
                    var internalid = pref.getValue({
                        name: 'internalid'
                    });
                    var prefRec = record.load({
                        type: 'customrecord_debt_coll_pref',
                        id: internalid
                    });
                    prefRec.setValue({
                        fieldId: 'name',
                        value: userId
                    });
                    prefRec.setValue({
                        fieldId: 'custrecord_pref_author',
                        value: userName
                    });
                    prefRec.setValue({
                        fieldId: 'custrecord_pref_range_id',
                        value: range
                    });
                    prefRec.setValue({
                        fieldId: 'custrecord_pref_date_from',
                        value: $('#date_from').val()
                    });
                    prefRec.setValue({
                        fieldId: 'custrecord_pref_date_to',
                        value: $('#date_to').val()
                    });
                    var prefRecId = prefRec.save();
                    // console.log('Record Saved, ID = ' + prefRecId);
                })
            }
            afterSubmit();
        }

        function onclick_noteSection(custid, noteVal, invoiceNumber, record_value) {
            // console.log("Cust Id From Input Field: " + custid);
            // console.log('record Value: ' + record_value);
            // console.log("Invoice Number: " + invoiceNumber);

            // var initials = userName.split(' ').map(function (n) {return n[0]}).join(".");
            var newNote = userName + ' - ' + getDate().toString() + ' ' + formatAMPM() + ': ' + noteVal;
            // var newNote = noteVal;

            var noteSearch = search.load({
                id: 'customsearch_debt_coll_user_note',
                type: 'customrecord_debt_coll_user_note'
            });
            noteSearch.filters.push(search.createFilter({
                name: 'name',
                operator: search.Operator.CONTAINS,
                values: invoiceNumber
            }));
            var noteResults = noteSearch.run().getRange({ start: 0, end: 1});

            if (!isNullorEmpty(noteResults)){
                noteResults.forEach(function(noteResult){  
                    
                    // Load User Note and Save onto User Note record  
                    var noteID = noteResult.getValue({
                        name: 'internalid'
                    });
                    console.log(noteID);
                    var oldNote = noteResult.getValue({
                        name: 'custrecord_debt_coll_note'
                    });
                    console.log('User note Found: ' + noteID);

                    if (!isNullorEmpty(oldNote)){
                        var userNoteRecord = record.load({
                            type: 'customrecord_debt_coll_user_note',
                            id: noteID
                        });
                        var userNote = userNoteRecord.setValue({
                            fieldId: 'custrecord_debt_coll_note',
                            value: oldNote + '\n' + newNote
                        });
                    } else {
                        var userNote = userNoteRecord.setValue({
                            fieldId: 'custrecord_debt_coll_note',
                            value: newNote
                        });
                    }
                    if (!isNullorEmpty(userNote)){
                        userNoteRecord.save();
                    }
                });
            } else {
                console.log('USer Note not found. Creating New One')
                //Create new User Note and Save on record.
                var userNoteRecord = record.create({
                    type: 'customrecord_debt_coll_user_note'
                });
                userNoteRecord.setValue({
                    fieldId: 'name',
                    value: 'Debt Collections _ ' + invoiceNumber
                });
                // userNoteRecord.setValue({
                //     fieldId: 'entity',
                //     value: custid
                // });
                userNoteRecord.setValue({
                    fieldId: 'custrecord_debt_coll_note_author',
                    value: userName
                });
                var initialFormattedDateString = getDate().toString();
                var parsedDateStringAsRawDateObject = format.parse({ value: initialFormattedDateString, type: format.Type.DATE });
                userNoteRecord.setValue({
                    fieldId: 'custrecord_debt_coll_note_date',
                    value: parsedDateStringAsRawDateObject
                });
                var userNote = userNoteRecord.setValue({
                    fieldId: 'custrecord_debt_coll_note',
                    value: newNote
                });
                if (!isNullorEmpty(userNote)){
                    userNoteRecord.save();
                } 
            }

            // Load Note from Debt Coll Record and Set as New Note Value
            // var tickRecord = record.load({
            //     type: 'customrecord_debt_coll_inv',
            //     id: record_value
            // });
            // if (!isNullorEmpty(noteInfo)){ // For invoices already containing a note
            //     var tick_note = tickRecord.setValue({
            //         value: oldNote + '\n' + newNote,
            //         fieldId: 'custrecord_debt_coll_inv_note'
            //     });
            // } else {
            //     var tick_note = tickRecord.setValue({
            //         value: newNote,
            //         fieldId: 'custrecord_debt_coll_inv_note'
            //     });
            // }
            // tick_status = tickRecord.setValue({
            //     value: 'true',
            //     fieldId: 'custrecord_debt_coll_inv_note_status'
            // });
            // if (!isNullorEmpty(tick_note)){
            //     var tickRecSave = tickRecord.save();
            // }
        }

        function loadDebtRecord(range, date_from, date_to) {
            var invoiceResults = search.load({
                type: 'customrecord_debt_coll_inv',
                id: 'customsearch_debt_coll_table'
            });
            var filterExpression = [];
            filterExpression.push(['custrecord_debt_coll_inv_date', search.Operator.ONORAFTER, date_from]);
            filterExpression.push('AND', ['custrecord_debt_coll_inv_date', search.Operator.ONORBEFORE, date_to]);
            var rangeExpression = [];
            if (range.includes('1') == true) {
                console.log('MPEX Products Selected');
                rangeExpression.push(['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 1]);
            }
            if (range.includes('2') == true) {
                console.log('0 - 59 Days Selected');
                if (range.length <= 1 || range.includes('1') == false){
                    rangeExpression.push(['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 2]);
                } else {
                    rangeExpression.push('OR', ['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 2]);  
                }
            }
            if(range.includes('3') == true) {
                console.log('60+ Days Selected');
                if (range.length <= 1){
                    rangeExpression.push(['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 3]);
                } else {
                    rangeExpression.push('OR', ['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 3]);
                }
            }
            filterExpression.push('AND', rangeExpression);
            filterExpression.push('AND', ['custrecord_debt_coll_inv_cust_name', search.Operator.DOESNOTCONTAIN, 'Secure Cash']);
            filterExpression.push('AND', ['custrecord_debt_coll_inv_cust_name', search.Operator.DOESNOTCONTAIN, 'NP']);
            invoiceResults.filterExpression = filterExpression;

            var invResultRun = invoiceResults.run();
            
            var invResultSet = [];
            var main_index = 0;
            for (var main_index = 0; main_index < 10000; main_index += 1000){
                invResultSet.push(invResultRun.getRange({start: main_index, end: main_index + 999}));
            }

            if (!isNullorEmpty(invResultSet)) {
                for (var i = 0; i < invResultSet.length; i++){
                    invResultSet[i].forEach(function(invoiceSet, index) {
                        var recID = invoiceSet.getValue({ 
                            name: 'internalid'
                        });
                        var invoice_id = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_id'
                        });
                        var date = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_date'
                        });
                        var invoice_name = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_name'
                        });
                        var maap_bank = invoiceSet.getValue({
                            name: 'custrecord_debt_inv_maap_bank'
                        });
                        var customer_id = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_cust_id'
                        });
                        var customer_name = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_cust_name'
                        });
                        var zee_name = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_zee_id'
                        });
                        var total_amount = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_tot_am'
                        });
                        var overdue = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_overdue'
                        });
                        var due_date = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_due_date'
                        });
                        var period = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_period'
                        });
                        var note = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_note'
                        });
                        var mp_ticket = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_mp_ticket',
                        });
                        var maap_status = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_status'
                        });
                        var tick_status = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_note_status'
                        });
                        var snooze = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_snooze'
                        });
                        // var viewedRecord = record.load({
                        //     type: 'invoice',
                        //     id: invoice_id
                        // });
                        // var viewed = viewedRecord.getValue({
                        //     fieldId: 'custbody_invoice_viewed'
                        // });
                        // console.log('Testing if you can do code here ' + viewed);
                        var viewed = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_viewed'
                        });
                        
                        if (!isNullorEmpty(zee_name) || !isNullorEmpty(customer_name)) {
                            debt_set.push({
                                dt: date,// 0
                                inid: invoice_id, //1
                                in: invoice_name, // 2
                                mba: maap_bank,
                                cid: customer_id,
                                cm: customer_name,
                                zee: zee_name,
                                ta: total_amount,
                                od: overdue,
                                dd: due_date,
                                p: period,
                                nt: note,
                                mp: mp_ticket,
                                ms: maap_status,
                                ts: tick_status,
                                id: recID,
                                zzz: snooze,
                                eye: viewed
                            });
                        }
                        return true;
                    });
                }
                loadDatatable(debt_set);
                debt_set = [];
            } else {
                console.log('Results Empty');
                alert('Results Empty');
            }
        }

        function loadDatatable(debt_rows) {
            // $('#result_debt').empty();
            debtDataSet = [];
            if (!isNullorEmpty(debt_rows)) {
                debt_rows.forEach(function(debt_row, index) {
                    var count = 0;
                    var dateValue = debt_row.dt
                    var date_split = dateValue.split("/") //when date is entered in DD/MM/YYYY format. We split days months and year
                    if (date_split[0].length == 1){
                        var days = '0' + date_split[0]; //get DD
                        var month = date_split[1]; //get MM
                        var year = date_split[2]; //get YYYY
                        var date = days + '/' + month + '/' + year;
                    } else {
                        var date = dateValue;
                    }
                    var invoice_id = debt_row.inid;
                    var invoice_name = debt_row.in;
                    var upload_url_inv = '/app/accounting/transactions/custinvc.nl?id=';
                    var invoice = '<a href="' + baseURL + upload_url_inv + invoice_id + '" target="_blank">' + invoice_name + '</a>';
                    var maap_bank = debt_row.mba;
                    var customer_id = debt_row.cid;
                    var cm_link = debt_row.cm;
                    var params = {
                        custid: customer_id,
                        scriptid: 'customscript_sl_customer_list',
                        deployid: 'customdeploy_sl_customer_list'
                    }
                    params = JSON.stringify(params);
                    var upload_url_cust = '/app/common/entity/custjob.nl?id=';
                    var company_name = '<a href="' + baseURL + upload_url_cust + customer_id + '" target="_blank">' + cm_link + '</a>';
                    var zee = debt_row.zee;
                    var amount = parseFloat(debt_row.ta);
                    debt_rows.forEach(function(debt) {
                        var cust_name = debt.cm;
                        if (cust_name == cm_link) {
                            count++;
                        }
                    });
                    var tot_num = count;
                    var tot_am = amount;
                    tot_am = financial(tot_am);
                    var due_date = debt_row.dd;
                    var overdue = debt_row.od;
                    var period = debt_row.p;
                    
                    var noteInfo = debt_row.nt;
                    var note = '<div class="col-xs-6"><button type="button" id="note_' + invoice_id + '" class="note form-control btn-xs btn-secondary" data-toggle="modal" data-target="#myModal"><span class="glyphicon glyphicon-pencil"></span></button></div>';
                    note +=  '<div class="col-xs-6"><button type="button" id="eye_more_' + invoice_id + '" class="eye form-control btn-xs btn-secondary"><span class="glyphicon glyphicon-eye-open"></span></button></div>';
                    var checkbox =  '<div class="col-xs-9"><button type="button" id="eye_multi_' + invoice_id + '" class="eyeplus form-control btn-xs btn-secondary"><span class="glyphicon glyphicon glyphicon-list"></span>  </button></div>';
                    checkbox += '<div class="col-xs-auto"><button type="button" id="timer_' + invoice_id + '" class="timer form=control btn-xs btn-info"><span class="span_class glyphicon glyphicon-time"></span></button></div>';
                                        
                    var mp_ticket = debt_row.mp
                    var maap_status = debt_row.ms;
                    var tick_status = debt_row.ts;
                    var record_id = debt_row.id;
                    var snooze = debt_row.zzz;
                    // var viewedRecord = record.load({
                    //     type: 'invoice',
                    //     id: invoice_id
                    // });
                    // var viewed = viewedRecord.getValue({
                    //     fieldId: 'custbody_invoice_viewed'
                    // });
                    // console.log('Testing if you can do code here ' + viewed);
                    var viewed = debt_row.eye;

                    if (!isNullorEmpty(zee) || !isNullorEmpty(company_name)) {
                        debtDataSet.push([date, invoice, maap_bank, company_name, zee, tot_num, tot_am, due_date, overdue, period, mp_ticket, note, checkbox, maap_status, customer_id, tick_status, record_id, snooze, viewed]);
                    }
                });
            }
            var datatable = $('#debt_preview').DataTable();
            datatable.clear();
            datatable.rows.add(debtDataSet);
            datatable.draw();
            
            return true;
        }

        function saveRecord() {}
        /**
         * Function to select Range Options
         */
        function selectRangeOptions() {
            // var rangeArray = rangeSelection();
            var range_filter = $('#range_filter option:selected').map(function() { return $(this).val() });
            range_filter = $.makeArray(range_filter);
            $('#range_filter').selectpicker('val', range_filter);
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

        function formatAMPM() {
            var date = new Date();
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0'+minutes : minutes;
            var strTime = hours + ':' + minutes + ' ' + ampm;
            return strTime;
        }

        /**
         * @param   {Number} x
         * @returns {String} The same number, formatted in Australian dollars.
         */
        function financial(x) {
            if (typeof(x) == 'string') {
                x = parseFloat(x);
            }
            if (isNullorEmpty(x) || isNaN(x)) {
                return "$0.00";
            } else {
                return x.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
            }
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
    });