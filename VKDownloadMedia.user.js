// ==UserScript==
// @name        VKDownloadMedia
// @description Скачать фото/аудио/видео-файлы с соц. сети ВКонтакте.
// @namespace   https://github.com/KJ86/VKDownloadMedia
// @version     5.2
// @date        2017-03-01
// @author      KJ86
// @icon        data:image/gif;base64,R0lGODlhDQANAIABAHKTtgAAACH5BAEAAAEALAAAAAANAA0AAAIYjAOZx+2n1pstgmlxrDabrnCeKD0hhTgFADs=
// @homepage    https://greasyfork.org/ru/scripts/7385-vkdownloadmedia
// @downloadURL https://greasyfork.org/scripts/7385-vkdownloadmedia/code/VKDownloadMedia.user.js
// @supportURL  https://vk.com/vkdownloadmedia
// @include     *
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function () {
    'use strict';

    // ifarme handler
    if (window.self !== window.top) {
        var param = location.hash.match(/vkdm=(.*)/i);

        if (param !== null) {
            param = JSON.parse(decodeURIComponent(param[1]));

            if (typeof param.fileName !== 'undefined') { // Download file
                var fileExtension = function () {
                    var i, match;
                    var arr = param.url.split('.');

                    for (i = 0; i < arr.length; i++) {
                        match = arr[i].match(/(.+?)\?/);

                        if (match) {
                            return match[1];
                        }
                    }
                }();
                var a = document.createElement('a');

                a.href = param.url;
                a.download = param.fileName + '.' + fileExtension;

                document.body.appendChild(a).click();
                window.top.postMessage('VKDM:' + JSON.stringify(param), '*');
            } else if (typeof param.fileSize !== 'undefined') { // Get file size
                var xhr = new XMLHttpRequest();

                xhr.open('HEAD', param.url);
                xhr.onload = function () {
                    param.fileSize = xhr.getResponseHeader('content-length');

                    window.top.postMessage('VKDM:' + JSON.stringify(param), '*');
                };
                xhr.send();
            }
        }

        return;
    }

    // Only on vk.com
    if (location.hostname !== 'vk.com') return;

    // Add download button
    (function () {
        var isDwnlPlBtnAdd = false;
        var dwAudioBtn = ce('div', {
            className: 'audio_act',
            id: '',
            innerHTML: '<div></div>'
        });

        dwAudioBtn.setAttribute('onmouseover', 'VKDM.audioShowActionTooltip(this)');
        dwAudioBtn.setAttribute('onclick', 'VKDM.downloadAudio(this)');

        setInterval(function () {
            // Audio
            var audioRows = domQuery('.audio_row:not(.candownload):not(.claimed)');

            if (audioRows.length) {
                each(audioRows, function (i, audioRow) {
                    var audioActs = audioRow.querySelector('.audio_acts');
                    var clone = dwAudioBtn.cloneNode(true);

                    clone.id = getRandomID('download');
                    clone.setAttribute('data-full-id', audioRow.getAttribute('data-full-id'));
                    audioActs.insertBefore(clone, audioActs.firstElementChild);
                    audioRow.classList.add('candownload');
                });
            }

            // Video
            if (ge('video_player') && !ge('mv_download')) {
                if (typeof mvcur !== 'undefined' && mvcur.player && mvcur.player.getVars) {
                    var videoData = mvcur.player.getVars();

                    if (videoData) {
                        var prop, match, items = [];

                        for (prop in videoData) {
                            match = prop.match(/url(\d+)/);

                            if (match) {
                                if (parseInt(match[1], 10) >= 720) {
                                    match[1] += ' <span style="font-size:smaller;color:#939393;">HD</span>';
                                }

                                items.push([prop, match[1], videoData[prop]]);
                            }
                        }

                        if (items.length) {
                            domInsertBefore(ce('div', {
                                className: 'mv_more fl_l',
                                id: 'mv_download',
                                innerHTML: 'Скачать'
                            }), ge('mv_more'));

                            new InlineDropdown('mv_download', {
                                items: items.reverse(),
                                withArrow: true,
                                keepTitle: true,
                                autoShow: true,
                                autoHide: 300,
                                headerLeft: -17,
                                headerTop: -11,
                                sublists: {},
                                onSelect: function (id, data) {
                                    VKDM.downloadVideo(data[2], ge('mv_title').textContent);
                                }
                            });
                        }
                    }
                }

            }

            // Photo
            var photosAlbumInfo = geByClass1('photos_album_info');

            if (photosAlbumInfo && !ge('vkdm_download_album')) {
                photosAlbumInfo.parentNode.appendChild(cf('<span class="divide">|</span><span class="photos_album_info"><a id="vkdm_download_album" onclick="VKDM.downloadPhotoAlbumsList(); return false;">Скачать альбом</a></span>'));
            }

            // Play List
            if (isDwnlPlBtnAdd === false) {
                if (ap.layer && ap.layer._ttel) {
                    var dwnlPlBtn = ce('div', {
                        className: 'audio_download_current_btn audio_menu_btn'
                    });

                    dwnlPlBtn.setAttribute('onmouseover', "showTooltip(this, {text: 'Скачать', appendParentCls: '_audio_layer', black: 1, shift: [13, 9, 0]})");
                    dwnlPlBtn.setAttribute('onclick', 'VKDM.downloadCurrentAudioPlayList(); return false;');

                    domInsertAfter(dwnlPlBtn, geByClass1('audio_delete_current_btn', ap.layer._ttel));

                    if (dwnlPlBtn.parentNode) {
                        isDwnlPlBtnAdd = true;
                    }
                }
            }
        }, 300);
    })();

    // Add CSS rules
    document.head.appendChild(ce('style', {
        type: 'text/css',
        textContent: ''
        + '.audio_row .audio_acts .audio_act[id^="vkdm_download_"]'
        + '{display: block}'
        + '.audio_row .audio_acts .audio_act[id^="vkdm_download_"] > div,'
        + '.audio_menu_btn.audio_download_current_btn'
        + '{background-image: url("data:image/gif;base64,R0lGODlhDQANAIABAHKTtgAAACH5BAEAAAEALAAAAAANAA0AAAIYjAOZx+2n1pstgmlxrDabrnCeKD0hhTgFADs=")}'
        + '.audio_menu_btn.audio_download_current_btn'
        + '{height: 13px; width: 13px;}'
    }));

    // Remove temp iframe
    window.addEventListener('message', function (e) {
        if (e.data.indexOf('VKDM:') !== -1) {
            var data = JSON.parse(e.data.replace('VKDM:', ''));
            var iframeID = data.iframeID;

            if (data.fileSize) {
                var ttElement = ge(data.ttElementID);

                ttElement.classList.remove('vkdm_ajax_in_process');
                ttElement.setAttribute('data-file-size', data.fileSize);
                ttElement.setAttribute('data-audio-duration', data.duration);
                ttElement.tt.shown = false;
                ttElement.tt.show();
            }

            setTimeout(function () {
                re(iframeID);
            }, 1000);
        }
    }, false);

    // VKDM (Global)
    window.VKDM = {
        _audioUnmaskSource: function (mask) {
            var obj = {src: mask};

            try {
                AudioPlayerHTML5.prototype._setAudioNodeUrl(obj, mask);
            } catch(e) {};

            return obj.src;
        },

        audioShowActionTooltip: function (btn) {
            // Get file size
            if (!btn.hasAttribute('data-file-size')) {
                if (!btn.classList.contains('vkdm_ajax_in_process')) {
                    ajax.post('al_audio.php', {
                        act: 'reload_audio',
                        ids: btn.getAttribute('data-full-id')
                    }, {
                        onDone: function (items) {
                            createIframeTransport({
                                url: VKDM._audioUnmaskSource(items[0][2]),
                                duration: items[0][5],
                                fileSize: null,
                                ttElementID: btn.id
                            });
                        }
                    });
                    btn.classList.add('vkdm_ajax_in_process');
                }
            }

            showTooltip(btn, {
                text: function () {
                    var duration = btn.getAttribute('data-audio-duration');
                    var fileSizeByte = btn.getAttribute('data-file-size');
                    var fileSizeMByte = 0;
                    var bitrate = 0;

                    if (duration && fileSizeByte) {
                        fileSizeMByte = (fileSizeByte / 1024 / 1024).toFixed(1);
                        bitrate = parseInt(fileSizeByte * 8 / duration / 1000);
                    }

                    return 'Скачать аудиозапись<br>Битрейт: ~' + bitrate + ' кбит/с<br>Размер: ' + fileSizeMByte + ' МБ';
                },
                black: 1,
                shift: [7, 5, 0],
                needLeft: true
            });
        },

        downloadAudio: function (btn) {
            ajax.post('al_audio.php', {
                act: 'reload_audio',
                ids: btn.getAttribute('data-full-id')
            }, {
                onDone: function (items) {
                    createIframeTransport({
                        url: VKDM._audioUnmaskSource(items[0][2]),
                        fileName: ce('div', {innerHTML: items[0][4] + ' &ndash; ' + items[0][3]}).textContent
                    });
                }
            });
        },

        downloadVideo: function (url, fileName) {
            createIframeTransport({
                url: url,
                fileName: fileName
            });
        },

        downloadPhotoAlbumsList: function (el) {
            var items = [];
            var isFastBoxClosed = false;
            var downloadListBtnWrapID = getRandomID();
            var fileName = document.title.replace(/"/g, '');
            var match = location.pathname.match(/album(-?[0-9]+)_([0-9]+)/);
            var ownerId = match[1];
            var albumId = match[2];
            var count = 1000;
            var offset = 0;

            switch (albumId) {
                case '0': albumId = 'profile'; break;
                case '00': albumId = 'wall'; break;
                case '000': albumId = 'saved'; break;
            }

            var onDone = function () {
                var i, l, prop, match, nSizes;
                var srcArr = [];

                for (i = 0, l = items.length; i < l; i++) {
                    nSizes = [];

                    for (prop in items[i]) {
                        match = prop.match(/photo_(\d+)/);

                        if (match) {
                            nSizes.push(match[1]);
                        }
                    }

                    if (nSizes.length) {
                        srcArr.push(items[i]['photo_' + Math.max.apply(null, nSizes)]);
                    }
                }

                var downloadListBtnWrap = ge(downloadListBtnWrapID);

                if (downloadListBtnWrap) {
                    var url = createFile('text/plain;charset=utf-8', srcArr.join('\r\n'));

                    if (url) {
                        downloadListBtnWrap.innerHTML = ''
                        + '<a href="' + url + '" class="flat_button secondary" download="' + fileName + '.txt">.txt</a>&nbsp;'
                        + '<a href="' + url + '" class="flat_button secondary" download="' + fileName + '.urls">.urls</a>';
                    } else {
                        downloadListBtnWrap.textContent = 'Не удалось создать файл.';
                    }
                }
            };
            var getAllItems = function () {
                if (isFastBoxClosed === true) return;

                getJSONP('https://api.vk.com/method/photos.get?owner_id=' + ownerId + '&album_id=' + albumId + '&count=' + count + '&offset=' + offset + '&v=5.53', function (data) {
                    items = items.concat(data.items);

                    if (items.length === data.count) {
                        onDone();
                    } else {
                        offset += count;
                        getAllItems();
                    }
                });
            };

            showFastBox({
                title: 'VKDM - Скачать альбом',
                dark: 1,
                hideButtons: 1,
                onBeforeHide: function () {
                    isFastBoxClosed = true;

                    each(geByClass('flat_button', ge(downloadListBtnWrapID), 'a'), function (i, el) {
                        window.URL.revokeObjectURL(el.href);
                    });
                }
            }, ''
            + '<div style="text-align: center;">'
            + '<div style="color: #777;margin-bottom: 20px">'
            + 'Скачать список всех фотографий с альбома:'
            + '<br><b>' + fileName + '</b>'
            + '<br><i>(может занят продолжительное время)</i>'
            + '</div>'
            + '<div id="' + downloadListBtnWrapID + '"><img src="/images/upload.gif" style="margin-top: 10px; margin-bottom: 7px;" /></div>'
            + '</div>');
            getAllItems();
        },

        downloadCurrentAudioPlayList: function () {
            var dataArr = [];
            var audioIdsArr = [];
            var isFastBoxClosed = false;
            var downloadListBtnWrapID = getRandomID();
            var playListTitle = '';
            var getAudioLinks = function (ids) {
                if (isFastBoxClosed === true) return;

                ajax.post('al_audio.php', {
                    act: 'reload_audio',
                    ids: ids.join(',')
                }, {
                    onDone: function (items) {
                        if (items === '') {
                            setTimeout(function () {
                                getAudioLinks(ids);
                            }, 10000);

                            return;
                        }

                        each(items, function(i, el) {
                            dataArr.push({
                                url: VKDM._audioUnmaskSource(el[2]),
                                name: el[4] + ' – ' + el[3],
                                duration: el[5]
                            });
                        });

                        if (audioIdsArr.length) {
                            getAudioLinks(audioIdsArr.splice(0, 10));
                        } else {
                            var textFileData = [];
                            var m3uFileData = ['#EXTM3U'];

                            each(dataArr, function(i, el) {
                                textFileData.push(el.url);
                                m3uFileData.push('#EXTINF:' + el.duration + ', ' + el.name + '\r\n' + el.url);
                            });

                            var textFileURL = createFile('text/plain;charset=utf-8', textFileData.join('\r\n'));
                            var m3uFileURL = createFile('audio/x-mpegurl;charset=utf-8', m3uFileData.join('\r\n'));
                            var downloadListBtnWrap = ge(downloadListBtnWrapID);

                            if (textFileURL && m3uFileURL) {
                                downloadListBtnWrap.innerHTML = ''
                                + '<a href="' + m3uFileURL + '" class="flat_button secondary" download="' + playListTitle + '.m3u8">.M3U</a>&nbsp;'
                                + '<a href="' + textFileURL + '" class="flat_button secondary" download="' + playListTitle + '.txt">.txt</a>&nbsp;'
                                + '<a href="' + textFileURL + '" class="flat_button secondary" download="' + playListTitle + '.urls">.urls</a>';
                            } else {
                                downloadListBtnWrap.textContent = 'Не удалось создать файл.';
                            }
                        }
                    }
                });
            };

            (function () {
                var items = [];
                var title = '';

                if ('_list' in ap._currentPlaylist) {
                    items = ap._currentPlaylist._list;
                    title = ap._currentPlaylist._title;
                } else {
                    for (var prop in ap._currentPlaylist) {
                        if ('_list' in ap._currentPlaylist[prop]) {
                            items = ap._currentPlaylist[prop]['_list'];
                            title = ap._currentPlaylist[prop]['_title'];
                            break;
                        }
                    }
                }

                each(items, function(i, el) {
                    audioIdsArr.push(el[1] + '_' + el[0]);
                });

                playListTitle = (title || 'playlist') + ' (' + items.length + ')';
            })();

            if (audioIdsArr.length) {
                showFastBox({
                    title: 'VKDM - Скачать плейлист',
                    dark: 1,
                    hideButtons: 1,
                    onBeforeHide: function () {
                        isFastBoxClosed = true;

                        each(geByClass('flat_button', ge(downloadListBtnWrapID), 'a'), function (i, el) {
                            window.URL.revokeObjectURL(el.href);
                        });
                    }
                }, ''
                + '<div style="text-align: center;">'
                + '<div style="color: #777;margin-bottom: 20px">'
                + 'Скачать плейлист:'
                + '<br><b>' + playListTitle + '</b>'
                + '<br><i>(может занят продолжительное время)</i>'
                + '</div>'
                + '<div id="' + downloadListBtnWrapID + '"><img src="/images/upload.gif" style="margin-top: 10px; margin-bottom: 7px;" /></div>'
                + '</div>');
                getAudioLinks(audioIdsArr.splice(0, 10));
            }
        }
    };

    /*!
     * Helpers
     */
     function createIframeTransport(params) {
        var iframeID = getRandomID('iframe');
        var data = JSON.stringify(extend({
            iframeID: iframeID
        }, params));
        var src = params.url.split('.mp3')[0] + '.html?#vkdm=' + encodeURIComponent(data);
        var iframe = ce('iframe', {id: iframeID, src: src, width: '1', height: '1'}, {visibility: 'hidden'});

        document.body.appendChild(iframe);
    }

    function getJSONP(url, success) {
        var tempFuncName = 'vkdmFunc' + Date.now();

        window[tempFuncName] = function (response) {
            success(response.response);
            delete window[tempFuncName];
        };

        document.body.appendChild(ce('script', {
            src: url + '&callback=' + tempFuncName,
            onload: function () {
                re(this);
            },
            onerror: function () {
                re(this);
            }
        }));
    }

    function createFile(type, data) {
        var url = '';

        if (window.URL && window.URL.createObjectURL) {
            url = window.URL.createObjectURL(new Blob([data], {type: type}));
        }

        return url;
    }

    function getRandomID(name) {
        var prefix = 'vkdm' + (name ? '_' + name + '_' : '_');

        return prefix + Math.random().toString().slice(2, 10);
    }
})();
