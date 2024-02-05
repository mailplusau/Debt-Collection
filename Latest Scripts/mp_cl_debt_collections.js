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
    function (email, runtime, search, record, http, log, error, url, format, currentRecord) {
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

        function pageLoad() {
            $('.range_filter_section').addClass('hide');
            $('.range_filter_section_top').addClass('hide');
            $('.date_filter_section').addClass('hide');
            $('.period_dropdown_section').addClass('hide');

            $('.loading_section').removeClass('hide');
        }

        function beforeSubmit() {
            $('#debt_preview').hide();
            $('#debt_preview').addClass('hide');

            $('.loading_section').removeClass('hide');
        }

        function afterSubmit() {
            $('.range_filter_section').removeClass('hide');
            $('.range_filter_section_top').removeClass('hide');
            $('.date_filter_section').removeClass('hide');
            $('.period_dropdown_section').removeClass('hide');

            $('.loading_section').addClass('hide');

            $('#table_filter_section').removeClass('hide');
            $('#table_filter_section').show();

            if (!isNullorEmpty($('#result_debt').val())) {
                $('#debt_preview').removeClass('hide');
                $('#debt_preview').show();
            }

            $('#result_debt').on('change', function () {
                $('#debt_preview').removeClass('hide');
                $('#debt_preview').show();
            });

            $('#debt_preview').removeClass('hide');
            $('#debt_preview').show();
        }

        function pageInit() {
            // Background-Colors
            $("#NS_MENU_ID0-item0").css("background-color", "#CFE0CE");
            $("#NS_MENU_ID0-item0 a").css("background-color", "#CFE0CE");
            $("#body").css("background-color", "#CFE0CE");

            selectRangeOptions();
            selectTeamOptions();

            if (!isNullorEmpty($('#period_dropdown option:selected').val())) {
                selectDate();
            }
            $('#period_dropdown').change(function () {
                selectDate();
            });

            /**
             *  Save Preferences for Users
             */
            $(document).ready(function () {
                console.log('ID: ' + userName);

                var prefSearch = search.load({
                    type: 'customrecord_debt_coll_pref',
                    id: 'customsearch_debt_coll_pref'
                });
                prefSearch.filters.push(search.createFilter({
                    name: 'name',
                    operator: search.Operator.IS,
                    values: userId
                }));
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
                        value: '0'
                    });
                    prefRec.setValue({
                        fieldId: 'custrecord_pref_date_from',
                        value: '2021-01-01'
                    });
                    prefRec.setValue({
                        fieldId: 'custrecord_pref_date_to',
                        value: '2021-12-01'
                    });
                    var prefRecId = prefRec.save();
                    console.log('New Record Created For New User :' + prefRec);
                }
                prefSearch.run().each(function (pref) {
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
                    var date_to = prefRecord.getValue({
                        fieldId: 'custrecord_pref_date_to'
                    });
                    range_id = $('#range_filter').val(range_id);
                    var team_member = $('#team_filter').val(userId);
                    selectRangeOptions();
                    selectTeamOptions()
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
             *  Submit Button Function
             */
            $('#submit').click(function () {
                // Ajax request
                var fewSeconds = 10;
                var btn = $(this);
                btn.addClass('disabled');
                setTimeout(function () {
                    btn.removeClass('disabled');
                }, fewSeconds * 1000);

                beforeSubmit();
                submitSearch();

                // return true;
                dataTable = $('#debt_preview').DataTable();
            });

            /**
             *  Viewed Invoices by Finance Team 
             */
            $(document).on('click', '.eye', function () {
                try {
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
                } catch (e) {
                    alert('Netsuite Error Message (Contact IT if Issue Persists): ' + e)
                }
            });
            $(document).on('click', '.eyeplus', function () {
                try {
                    var tr = $(this).closest('tr');
                    var row = dataTable.row(tr);
                    console.log(row.data());
                    var index = row.data();

                    var invoiceNumber = (index[1].split('id=')[1]).split('"')[0];
                    console.log("Invoice Number: " + invoiceNumber);
                    var custid = index[14];
                    var recordID = index[16]

                    if ($(tr).hasClass('odd')) {
                        $(tr).css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light Purple\
                        $(tr).addClass('thisWorked');
                        $('.eyeplus_' + custid + '').css('background-color', 'rgba(179, 115, 242, 0.75)'); // Light Purple\
                        $('.eyeplus_' + custid + '').addClass('thisWorked');
                    } else {
                        $(tr).css('background-color', 'rgba(153, 68, 238, 0.5)'); // Dark Purple
                        $(tr).addClass('thisWorked');
                        $('.eyeplus_' + custid + '').css('background-color', 'rgba(153, 68, 238, 0.5)'); // Light Purple\
                        $('.eyeplus_' + custid + '').addClass('thisWorked');
                    }

                    window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + index[0] + '&multiviewed=true' + '&recordid=' + index[16] + '&custid=' + index[14],
                        '_blank'
                    );

                    var filter = search.createFilter({
                        name: 'custrecord_debt_coll_inv_cust_id',
                        operator: search.Operator.IS,
                        values: custid
                    });
                    var searchViewed = search.load({
                        id: 'customsearch_debt_coll_table',
                        type: 'customrecord_debt_coll_inv',
                        filters: filter
                    });
                    searchViewed.run().each(function (res) {
                        var internalRecordID = res.getValue({
                            name: 'internalid'
                        });
                        var snoozeInvoice = record.load({
                            type: 'customrecord_debt_coll_inv',
                            id: internalRecordID
                        });
                        snoozeInvoice.setValue({
                            fieldId: 'custrecord_debt_coll_viewed',
                            value: true
                        });
                        snoozeInvoice.save();
                    });
                } catch (e) {
                    alert('Netsuite Error Message (Contact IT If Issue Persists): ' + e)
                }
            });


            /**
             *  Notes Section
             */
            $(document).on('click', '.note', function () {
                try {
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
                    noteSearch.run().each(function (res) {
                        noteVal += res.getValue({ name: 'custrecord_debt_coll_note' });
                        date = res.getValue({ name: 'custrecord_debt_coll_note_date' })
                        author = res.getValue({ name: 'custrecord_debt_coll_note_author' });

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
                    note += '<div class="col-xs-1"><button type="button" id="tickbox_' + invoiceNumber + '" class="tickbox form=control btn-xs btn-warning" custid="' + custid + '" record="' + recordID + '" ><span class="span_class glyphicon glyphicon-plus"></span></button></div></div>';
                    note += '<br><br>';

                    body += bodyAuthor;
                    body += bodyNoteEdit;
                    body += bodyNoteOld;
                    body += note;

                    $('#myModal .modal-header').html(header);
                    $('#myModal .modal-body').html("");
                    $('#myModal .modal-body').html(body);
                    $('#myModal').modal("show");
                } catch (e) {
                    alert('Netsuite Error Message (Contact IT if Issue Persists): ' + e)
                }
            })

            // Notes Input and Submit
            $(document).on('click', '.tickbox', function () {
                try {
                    var invoiceNumber = ($(this).attr('id')).split('_')[1];
                    var noteVal = $('#note_' + invoiceNumber).val();
                    console.log("Note Value: " + noteVal);

                    // var invoiceNumber = $(this).attr('id');
                    var recordID = $(this).attr('record');
                    var custid = $(this).attr('custid');

                    if (!isNullorEmpty(noteVal)) {
                        if ($(this).find('btn-warning')) {
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
                } catch (e) {
                    alert('Netsuite Error Message (Contact IT if Issue Persists): ' + e)
                }
            });

            /**
             *  Snooze Button
             */
            $(document).on('click', '.timer', function () {
                try {
                    var tr = $(this).closest('tr');
                    var row = dataTable.row(tr);
                    var index = row.data();
                    console.log('Row Data: ' + index)
                    var invoiceNumber = (index[1].split('id=')[1]).split('"')[0];
                    console.log("Invoice Number: " + invoiceNumber);
                    var recordID = index[16];

                    var header = '<div><h3 style="text-align: center;"><label class="control-label">Snooze Timers</label></h3></div>';

                    var body = '<div><h4><label class="control-label">Please Select the Duration You Wish To Snooze The Customer For</label></h4></div>';

                    body += '<br>'

                    var bodyTimers = '<div /*class="col col-lg-12"*/ id="oldnote">';
                    bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-1day form=control btn-xs btn-info" record="' + recordID + '"><span class="span_class">1 Day</span></button></div>';
                    bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-2day form=control btn-xs btn-info" record="' + recordID + '"><span class="span_class">2 Days</span></button></div>';
                    bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-1week form=control btn-xs btn-info" record="' + recordID + '"><span class="span_class">1 Week</span></button></div>';
                    bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-2week form=control btn-xs btn-info" record="' + recordID + '"><span class="span_class">2 Weeks</span></button></div>';
                    bodyTimers += '<div class="col-md-2"><button type="button" id="' + invoiceNumber + '" class="timer-permanent form=control btn-xs btn-info" record="' + recordID + '"><span class="span_class">Permanent</span></button></div>';

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

            /**
             *  Snooze Timers
             */
            var today = new Date();
            var today_year = today.getFullYear();
            var today_month = today.getMonth();
            var today_day = today.getDate();

            var today_in_day = new Date(Date.UTC(today_year, today_month, today_day + 1));
            today_in_day = today_in_day.toISOString().split('T')[0]; // Split Date String to get the date.
            today_in_day = dateISOToNetsuite(today_in_day); // Convert from 2021-01-28 to 28/1/2021
            today_in_day = format.parse({ value: today_in_day, type: format.Type.DATE }); // Date Object
            // console.log('Today Format Netsuite ' + today_in_day)

            var today_in_2day = new Date(Date.UTC(today_year, today_month, today_day + 2));
            today_in_2day = today_in_2day.toISOString().split('T')[0];
            today_in_2day = dateISOToNetsuite(today_in_2day);
            today_in_2day = format.parse({ value: today_in_2day, type: format.Type.DATE }); // Date Object

            var today_in_week = new Date(Date.UTC(today_year, today_month, today_day + 7));
            today_in_week = today_in_week.toISOString().split('T')[0];
            today_in_week = dateISOToNetsuite(today_in_week);
            today_in_week = format.parse({ value: today_in_week, type: format.Type.DATE }); // Date Object

            var today_in_2week = new Date(Date.UTC(today_year, today_month, today_day + 14));
            today_in_2week = today_in_2week.toISOString().split('T')[0];
            today_in_2week = dateISOToNetsuite(today_in_2week);
            today_in_2week = format.parse({ value: today_in_2week, type: format.Type.DATE }); // Date Object

            $(document).on('click', '.timer-1day', function () {
                var invoiceNumber = $(this).attr('id');
                var recordID = $(this).attr('record');
                console.log("Invoice Number: " + invoiceNumber);

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');
                $('.timer_' + invoiceNumber).addClass('btn-success');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + today_in_day + '&period=1day' + '&recordid=' + recordID,
                    '_blank'
                );
            });
            $(document).on('click', '.timer-2day', function () {
                var invoiceNumber = $(this).attr('id');
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = $(this).attr('record');

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');
                $('.timer_' + invoiceNumber).addClass('btn-success');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + today_in_2day + '&period=2day' + '&recordid=' + recordID,
                    '_blank'
                );

            });
            $(document).on('click', '.timer-1week', function () {
                var invoiceNumber = $(this).attr('id');
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = $(this).attr('record');

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');
                $('.timer_' + invoiceNumber).addClass('btn-success');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + today_in_week + '&period=2day' + '&recordid=' + recordID,
                    '_blank'
                );
            });
            $(document).on('click', '.timer-2week', function () {
                var invoiceNumber = $(this).attr('id');
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = $(this).attr('record');

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');
                $('.timer_' + invoiceNumber).addClass('btn-success');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=' + today_in_2week + '&period=2week' + '&recordid=' + recordID,
                    '_blank'
                );
            });
            $(document).on('click', '.timer-permanent', function () {
                var invoiceNumber = $(this).attr('id');
                console.log("Invoice Number: " + invoiceNumber);
                var recordID = $(this).attr('record');

                $(this).addClass('btn-success');
                $(this).removeClass('btn-info');
                $('.timer_' + invoiceNumber).addClass('btn-success');

                window.open(baseURL + "/app/site/hosting/scriptlet.nl?script=1171&deploy=1" + '&invid=' + invoiceNumber + '&date=permanent&period=permanent' + '&recordid=' + recordID,
                    '_blank'
                );
            });

            /**
             *  Team Member Button
             */
            $(document).on('click', '.team', function () {
                var tr = $(this).closest('tr');
                var row = dataTable.row(tr);
                var index = row.data();
                // console.log(JSON.stringify(index));
                // var invoiceNumber = (index[1].split('id=')[1]).split('"')[0];
                // console.log("Invoice Number: " + invoiceNumber);
                var recordID = index[16];
                console.log("Record Number: " + recordID);
                var custID = index[14];
                console.log("Customer ID: " + custID)

                var header = '<div><h3 style="text-align: center;"><label class="control-label">Assign Invoice to a Finance Role</label></h3></div>';
                var body = '<div><p><label class="control-label">Please Select a Finance Team Member to Assign This Customer To</label></p></div>';
                body += '<br>'

                // var already_allocated = '';
                // var custRec = record.load({
                //         type: 'customer',
                //         id: custID
                //     });
                // custRec.getValue({ fieldId: 'custentity_debt_coll_auth_id' });
                // if () {

                //     already_allocated = 'disabled';
                // }

                var bodyTimers = '<div /*class="col col-lg-12"*/ id="team_allocate">';
                bodyTimers += '<div class="col-md-3"><button type="button" id="691582" class="team_allocate form=control btn-xs ' + +'" custid="' + custID + '" record="' + recordID + '"><span class="span_class">Turkan</span></button></div>';
                bodyTimers += '<div class="col-md-3"><button type="button" id="1672674" class="team_allocate form=control btn-xs" custid="' + custID + '" record="' + recordID + '"><span class="span_class">Madillon</span></button></div>';
                bodyTimers += '<div class="col-md-3"><button type="button" id="755585" class="team_allocate form=control btn-xs" custid="' + custID + '" record="' + recordID + '"><span class="span_class">Yassine</span></button></div>';
                bodyTimers += '<div class="col-md-3"><button type="button" id="1807440" class="team_allocate form=control btn-xs" custid="' + custID + '" record="' + recordID + '"><span class="span_class">Sarah</span></button></div>';
                bodyTimers += '<div class="col-md-3"><button type="button" id="924435" class="team_allocate form=control btn-xs" custid="' + custID + '" record="' + recordID + '"><span class="span_class">- Test -</span></button></div>';
                bodyTimers += '</div>';
                bodyTimers += '<br><br>';

                var dateText = '';
                var bodyCurrentDate = '';
                bodyTimers += '<br>';

                body += bodyTimers;
                body += bodyCurrentDate;

                $('#myModal3 .modal-header').html(header);
                $('#myModal3 .modal-body').html("");
                $('#myModal3 .modal-body').html(body);
                $('#myModal3').modal("show");
            });

            $(document).on('click', '.team_allocate', function () {
                try {
                    var auth_id = $(this).attr('id');
                    var record_id = $(this).attr('record');
                    var cust_id = $(this).attr('custid');
                    console.log('Team Allocation of ID ' + auth_id)
                    // console.log('Record ID: ' + record_id);

                    var custRecord = record.load({
                        type: 'customer',
                        id: cust_id
                    });
                    var recLoad = record.load({
                        type: 'customrecord_debt_coll_inv',
                        id: record_id
                    });
                    custRecord.setValue({
                        fieldId: 'custentity_debt_coll_auth_id',
                        value: auth_id
                    });
                    recLoad.setValue({
                        fieldId: 'custrecord_debt_coll_auth_id',
                        value: auth_id
                    });
                    custRecord.save();
                    recLoad.save();

                    $(this).addClass('btn-success');
                    $('.team_custid_' + cust_id).addClass('btn-success')
                } catch (e) {
                    alert('Error Message - If error persists, contact IT \n\n' + e.message);
                }
            });

            /** 
             * Table Filters Section
             */
            // MP Ticket Column
            $(document).on('click', '.toggle-mp-ticket', function (e) {
                e.preventDefault();
                // Get the column API object
                var column = dataTable.column(10);
                // Toggle the visibility
                column.visible(!column.visible());
                if (column.visible() == true) {
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
            $(document).on('click', '.toggle-maap', function (e) {
                e.preventDefault();

                // Ajax request
                var fewSeconds = 5;
                var btn = $(this);
                btn.addClass('disabled');
                setTimeout(function () {
                    btn.removeClass('disabled');
                }, fewSeconds * 1000);

                if ($(this).find('btn-danger')) {
                    $.fn.dataTable.ext.search.push(
                        function (settings, searchData, index, rowData, counter) {
                            if (rowData[13] == 'Not Payed') {
                                return true;
                            }
                            return false;
                        }
                    );
                    dataTable.draw();
                }
            });
            $(document).on('click', '.toggle-maap-danger', function (e) {
                e.preventDefault();
                $.fn.dataTable.ext.search.pop('');
                dataTable.draw();
            });

            // MAAP Bank Account Column
            $(document).on('click', '.toggle-maap-bank', function (e) {
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
             *  Date Range Filter
             */
            $('input[name="daterange"]').daterangepicker({
                opens: 'left',
                locale: {
                    format: 'DD/MM/YYYY',
                    cancelLabel: 'Clear'
                }
            });
            $('input[name="daterange"]').on('apply.daterangepicker', function (ev, picker) {
                console.log("A new date selection was made: " + picker.startDate.format('YYYY-MM-DD') + ' to ' + picker.endDate.format('YYYY-MM-DD'));
                $.fn.dataTable.ext.search.pop('');
                $.fn.dataTable.ext.search.push(
                    function (settings, data, dataIndex) {
                        var min = picker.startDate.format('YYYY-MM-DD');
                        var max = picker.endDate.format('YYYY-MM-DD');
                        var date_split = data[20].split('/');
                        console.log('Date Data being pushed' + data[20])
                        if (!isNullorEmpty(data[20])) {
                            var month = date_split[1];
                            if (date_split[1].length == 1) {
                                month = '0' + month;
                            }
                            var days = date_split[0];
                            if (date_split[0].length == 1) {
                                days = '0' + days;
                            }
                            var date = date_split[2] + '-' + month + '-' + days
                            console.log('Date Pushed' + date, 'Start Pushed' + min, 'End Pushed' + max);

                            if ((min === null && max === null) || (min === null && date <= max) || (min <= date && max === null) || (min <= date && date <= max)) {
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
            $('input[name="daterange"]').on('cancel.daterangepicker', function (start, end, label) {
                $(this).val('');
                $.fn.dataTable.ext.search.pop('');
                dataTable.draw();
            });

            /**
             *  Click for Instructions Section Collapse
             */
            $('.collapse').on('shown.bs.collapse', function () {
                $(".range_filter_section_top").css("padding-top", "500px");
            })
            $('.collapse').on('hide.bs.collapse', function () {
                $(".range_filter_section_top").css("padding-top", "0px");
            });

            // Redirect Service Debtors
            $(document).on('click', '#redirect_serv_debt', function () {
                var upload_url = baseURL + url.resolveScript({
                    deploymentId: "customdeploy_sl_service_debt",
                    scriptId: "customscript_sl_service_debt",
                })
                window.open(upload_url, '_blank');
            })

            if (!isNullorEmpty(dataTable)) {
                $(document).ready(function () {
                    var column = dataTable.column([21]); // Company Name Column
                    column.visible(false)
                });
            }
        }

        function submitSearch() {
            // duringSubmit();

            debtDataSet = [];
            debt_set = [];

            var datatable = $('#debt_preview').DataTable({
                destroy: true,
                data: debtDataSet,
                pageLength: 1000,
                order: [
                    [21, 'asc'] //[8, 'asc'],
                ],
                columns: [
                    { title: 'Date' }, //0
                    { title: 'Invoice Number' }, // 1
                    { title: 'MAAP Bank Account' }, // 2
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
                    { title: 'Viewed | Multi-Viewed' }, // 11
                    { title: 'Allocate | Snooze' }, // 12
                    { title: 'MAAP Payment Status' }, // 13
                    { title: '' },// 14 - Customer ID
                    { title: '' },// 15 - Tick Status / This is for the added notes section. Redundent
                    { title: '' },// 16 - Record ID
                    { title: '' }, // 17 - Notes
                    { title: '' },// 18 - Viewed,
                    // NAL - Duplicate?
                    { title: 'Email Sent?' }, // 19 - Invoice Email Notification
                    { title: 'Customer: Start Date' }, // 20 - Start Date
                    { title: 'Customer: Company Name' } // 21 - Company Name
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
                    targets: [4, 11, 12, 20, 21] //19,
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
                rowCallback: function (row, data) {
                    // $('td:eq(1)', row).html;       
                    $(row).addClass('')
                    if (data[19].includes('Yes')) {
                        if ($(row).hasClass('odd')) {
                            $(row).css('background-color', 'rgba(51, 204, 255, 0.65)'); // Lighter Blue / Baby Blue
                        } else {
                            $(row).css('background-color', 'rgba(78, 175, 214, 0.75)'); // Darker Blue
                        }
                    } else if (data[18] == true) {
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
                loadDebtRecord(range, userId, date_from, date_to, datatable);
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
                prefResult.each(function (pref) {
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
                })
            }
            afterSubmit();
        }

        function loadDebtRecord(range, userId, date_from, date_to, datatable) {
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
                if (range.length <= 1 || range.includes('1') == false) {
                    rangeExpression.push(['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 2]);
                } else {
                    rangeExpression.push('OR', ['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 2]);
                }
            }
            if (range.includes('3') == true) {
                console.log('60+ Days Selected');
                if (range.length <= 1) {
                    rangeExpression.push(['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 3]);
                } else {
                    rangeExpression.push('OR', ['custrecord_debt_coll_inv_range', search.Operator.CONTAINS, 3]);
                }
            }
            if (parseInt(range) == 0) {
                console.log('No Range Filter Has Been Added')
            } else {
                filterExpression.push('AND', rangeExpression);
            }
            if (!isNullorEmpty(userId)) {
                var teamExpression = [];
                var auth_id = $('#team_filter').val();
                console.log('On Load Auth ID in Team Filter: ' + auth_id)
                if ((parseInt(auth_id) == 691582) || parseInt(auth_id) == 755585 || (parseInt(auth_id) == 924435) || parseInt(auth_id) == 1672674) { // Old Ones: Jassmeet 1403209 || Jori - 429450 || Azalea - 1626909 || 
                    if (!isNullorEmpty(auth_id)) {
                        teamExpression.push(['custrecord_debt_coll_auth_id', search.Operator.IS, auth_id]) //  if (parseInt(range) == 0) { } else { teamExpression.push('AND', ['custrecord_debt_coll_auth_id', search.Operator.IS, auth_id]) }
                    } else {
                        teamExpression.push(['custrecord_debt_coll_auth_id', search.Operator.IS, userId]) // if (parseInt(range) == 0) { } else { teamExpression.push('AND', ['custrecord_debt_coll_auth_id', search.Operator.IS, userId]) }
                    }
                    filterExpression.push('AND', teamExpression);
                } else {
                    console.log('No Team Member Select Filter has been Added')
                    // Don't Filter. 
                }
            }
            filterExpression.push('AND', ['custrecord_debt_coll_inv_cust_name', search.Operator.DOESNOTCONTAIN, 'NP - ']);
            filterExpression.push('AND', ['custrecord_debt_coll_inv_cust_name', search.Operator.DOESNOTCONTAIN, 'SC - ']);
            invoiceResults.filterExpression = filterExpression;

            var invResultRun = invoiceResults.run();

            var invResultSet = [];
            var main_index = 0;
            for (var main_index = 0; main_index < 10000; main_index += 1000) {
                invResultSet.push(invResultRun.getRange({ start: main_index, end: main_index + 999 }));
            }

            if (!isNullorEmpty(invResultSet)) {
                for (var i = 0; i < invResultSet.length; i++) {
                    invResultSet[i].forEach(function (invoiceSet, index) {

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
                        var viewed = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_viewed'
                        });
                        //Invoice Email Notification
                        var inv_email_sent = invoiceSet.getValue({ name: 'custrecord_debt_coll_inv_email_sent' });
                        var inv_email_sent_count = invoiceSet.getValue({ name: 'custrecord_debt_coll_inv_email_sent_cnt' });

                        var start_date = invoiceSet.getValue({ name: 'custrecord_debt_coll_commencement' });

                        var company_name = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_comp_name'
                        })

                        if (!isNullorEmpty(zee_name) || !isNullorEmpty(customer_name)) {
                            debt_set.push({
                                dt: date, // 0
                                inid: invoice_id, //1
                                in: invoice_name, // 2
                                mba: maap_bank,
                                cid: customer_id,
                                cn: customer_name,
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
                                eye: viewed,
                                inv_email_sent: inv_email_sent,
                                inv_email_sent_count: inv_email_sent_count,
                                sd: start_date,
                                cmn: company_name
                            });
                        }
                        return true;
                    });
                }
                loadDatatable(debt_set, datatable);
                debt_set = [];
            } else {
                console.log('Results Empty');
                alert('Results Empty');
            }
        }

        function loadDatatable(debt_rows, datatable) {
            // $('#result_debt').empty();
            debtDataSet = [];
            var duplicate_set = [];
            var duplicate = false;
            if (!isNullorEmpty(debt_rows)) {
                debt_rows.forEach(function (debt_row, index) {
                    var invoice_id = debt_row.inid;
                    if (duplicate_set.indexOf(invoice_id) != -1) {
                        duplicate = true;
                    }
                    duplicate_set.push(invoice_id);
                    var count = 0;
                    var dateValue = debt_row.dt
                    var date_split = dateValue.split("/") //when date is entered in DD/MM/YYYY format. We split days months and year
                    if (date_split[0].length == 1) {
                        var days = '0' + date_split[0]; //get DD
                        var month = date_split[1]; //get MM
                        var year = date_split[2]; //get YYYY
                        var date = days + '/' + month + '/' + year;
                    } else {
                        var date = dateValue;
                    }

                    var invoice_name = debt_row.in;
                    var upload_url_inv = '/app/accounting/transactions/custinvc.nl?id=';
                    var invoice = '<a href="' + baseURL + upload_url_inv + invoice_id + '" target="_blank">' + invoice_name + '</a>';
                    var maap_bank = debt_row.mba;
                    var customer_id = debt_row.cid;

                    var company_name = debt_row.cmn; // Company Name

                    var cm_link = debt_row.cn; // Company Name with Cust ID
                    var upload_url_cust = '/app/common/entity/custjob.nl?id=';
                    var customer_name = '<a href="' + baseURL + upload_url_cust + customer_id + '" target="_blank">' + cm_link + '</a>';
                    var zee = debt_row.zee;
                    var amount = parseFloat(debt_row.ta);
                    debt_rows.forEach(function (debt) {
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
                    var note = '<div class="col-xs-6"><button type="button" id="eye_more_' + invoice_id + '" class="eye form-control btn-xs btn-secondary"><span class="glyphicon glyphicon-eye-open"></span></button></div>';
                    note += '<div class="col-xs-6"><button type="button" id="eye_multi_' + customer_id + '" class="eyeplus eyeplus_' + customer_id + ' form-control btn-xs btn-secondary"><span class="glyphicon glyphicon glyphicon-list"></span>  </button></div>';
                    var checkbox = '<div class="col-xs-6"><button type="button" id="team_' + invoice_id + '" class="team team_custid_' + customer_id + ' form-control btn-xs btn-secondary" data-toggle="modal" data-target="#myModal3"><span class="glyphicon glyphicon-user"></span></button></div>';
                    checkbox += '<div class="col-xs-auto"><button type="button" id="timer_' + invoice_id + '" class="timer form=control btn-xs btn-info"><span class="span_class glyphicon glyphicon-time"></span></button></div>';

                    var mp_ticket = debt_row.mp
                    var maap_status = debt_row.ms;
                    var tick_status = debt_row.ts;
                    var record_id = debt_row.id;
                    var snooze = debt_row.zzz;
                    var viewed = debt_row.eye;
                    //Email Notification
                    if (!isNullorEmpty(debt_row.inv_email_sent)) {
                        var inv_email_notification = '<p>' + debt_row.inv_email_sent + ' : ' + debt_row.inv_email_sent_count + '</p>'
                    } else {
                        var inv_email_notification = '<p>' + debt_row.inv_email_sent + ' : 0</p>'
                    }
                    var start_date = debt_row.sd;

                    if (!isNullorEmpty(zee) || !isNullorEmpty(customer_name)) {
                        debtDataSet.push([date, invoice, maap_bank, customer_name, zee, tot_num, tot_am, due_date, overdue, period, mp_ticket, note, checkbox, maap_status, customer_id, tick_status, record_id, snooze, viewed, inv_email_notification, start_date, company_name]); //duplicate -19,
                    }
                });
            }
            // var datatable = $('#debt_preview').DataTable();
            datatable.clear();
            datatable.rows.add(debtDataSet);
            datatable.draw();

            return true;
        }

        function saveRecord() { }

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
        function selectRangeOptions() {
            // var rangeArray = rangeSelection();
            var range_filter = $('#range_filter option:selected').map(function () { return $(this).val() });
            range_filter = $.makeArray(range_filter);
            $('#range_filter').selectpicker('val', range_filter);
        }
        function selectTeamOptions() {
            var team_filter = $('#team_filter option:selected').map(function () { return $(this).val() });
            team_filter = $.makeArray(team_filter);
            $('#team_filter').selectpicker('val', team_filter);
        }

        function onclick_noteSection(custid, noteVal, invoiceNumber, record_value) {
            var newNote = userName + ' - ' + getDate().toString() + ' ' + formatAMPM() + ': ' + noteVal;

            var noteSearch = search.load({
                id: 'customsearch_debt_coll_user_note',
                type: 'customrecord_debt_coll_user_note'
            });
            noteSearch.filters.push(search.createFilter({
                name: 'name',
                operator: search.Operator.CONTAINS,
                values: invoiceNumber
            }));
            var noteResults = noteSearch.run().getRange({ start: 0, end: 1 });

            if (!isNullorEmpty(noteResults)) {
                noteResults.forEach(function (noteResult) {

                    // Load User Note and Save onto User Note record  
                    var noteID = noteResult.getValue({
                        name: 'internalid'
                    });
                    console.log(noteID);
                    var oldNote = noteResult.getValue({
                        name: 'custrecord_debt_coll_note'
                    });
                    console.log('User note Found: ' + noteID);

                    if (!isNullorEmpty(oldNote)) {
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
                    if (!isNullorEmpty(userNote)) {
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
                if (!isNullorEmpty(userNote)) {
                    userNoteRecord.save();
                }
            }
        }

        /**
         * Create the CSV and store it in the hidden field 'custpage_table_csv' as a string.
         * @param {Array} billsDataSet The `billsDataSet` created in `loadDatatable()`.
         */
        function saveCSV(debtDataSet) {
            var headers = $('#debt_preview').DataTable().columns().header().toArray().map(function (x) { return x.innerText });
            headers = headers.slice(0, headers.length - 1).join(', ');
            var csv = headers + "\n";
            debtDataSet.forEach(function (row) {
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
            minutes = minutes < 10 ? '0' + minutes : minutes;
            var strTime = hours + ':' + minutes + ' ' + ampm;
            return strTime;
        }

        /**
         * @param   {Number} x
         * @returns {String} The same number, formatted in Australian dollars.
         */
        function financial(x) {
            if (typeof (x) == 'string') {
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