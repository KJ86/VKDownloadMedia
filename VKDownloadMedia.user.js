// ==UserScript==
// @name        VKDownloadMedia
// @namespace   https://github.com/KJ86/VKDownloadMedia
// @version     5.0
// @date        2016-08-28
// @author      KJ86
// @description Скачать фото/аудио/видео-файлы с соц. сети ВКонтакте.
// @homepage    https://github.com/KJ86/VKDownloadMedia
// @downloadURL https://github.com/KJ86/VKDownloadMedia/raw/master/VKDownloadMedia.user.js
// @include     *vk*
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function () {
    'use strict';

    // ifarme handler
    if (window.self !== window.top) {
        var regexp = /vkdm=(.*)/i;
        var param = regexp.exec(location.hash);

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
                window.parent.postMessage('VKDM:' + JSON.stringify(param), '*');
            } else if (typeof param.fileSize !== 'undefined') { // Get file size
                var xhr = new XMLHttpRequest();

                xhr.open('HEAD', param.url);
                xhr.onload = function () {
                    param.fileSize = xhr.getResponseHeader('content-length');

                    window.parent.postMessage('VKDM:' + JSON.stringify(param), '*');
                };
                xhr.send();
            }
        }

        return;
    }

    if (location.hostname !== 'vk.com') return;

    // Add download button
    (function () {
        var dwAudioBtn = ce('div', {
            className: 'audio_act',
            id: 'vkdm_download_',
            innerHTML: '<div></div>'
        });

        dwAudioBtn.setAttribute('onmouseover', 'VKDM.audioShowActionTooltip(this)');
        dwAudioBtn.setAttribute('onclick', 'VKDM.downloadAudio(this)');

        setInterval(function () {
            // Audio
            var audioRows = domQuery('.audio_row:not(.candownload)');

            if (audioRows.length) {
                each(audioRows, function (i, audioRow) {
                    var audioActs = audioRow.querySelector('.audio_acts');
                    var clone = dwAudioBtn.cloneNode(true);

                    clone.id += (Math.random().toString(36).replace('.', ''));
                    clone.setAttribute('data-full-id', audioRow.getAttribute('data-full-id'));
                    audioActs.insertBefore(clone, audioActs.firstElementChild);
                    audioRow.classList.add('candownload');
                });
            }

            // Video
            if (ge('video_player') && !ge('mv_download')) {
                var videoData = mvcur && mvcur.player && mvcur.player.vars;

                if (videoData) {
                    var prop, match, items = [];

                    for (prop in videoData) {
                        match = prop.match(/url(\d+)/);

                        if (match) {
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

            // Photo
            var photosAlbumInfo = geByClass1('photos_album_info');

            if (photosAlbumInfo && !ge('vkdm_download_album')) {
                photosAlbumInfo.parentNode.appendChild(cf('<span class="divide">|</span><span class="photos_album_info"><a id="vkdm_download_album" onclick="VKDM.downloadPhotoAlbumsList(); return false;">Скачать альбом</a></span>'));
            }
        }, 300);
    })();

    // Add CSS rules
    document.head.appendChild(ce('style', {
        type: 'text/css',
        textContent: '\
        .audio_row .audio_acts .audio_act[id^="vkdm_download_"] {display: block}\
        .audio_row .audio_acts .audio_act[id^="vkdm_download_"] > div {background-image: url("data:image/gif;base64,R0lGODlhDQANAIABAHKTtgAAACH5BAEAAAEALAAAAAANAA0AAAIYjAOZx+2n1pstgmlxrDabrnCeKD0hhTgFADs=")}'
    }));

    // Remove temp iframe
    window.addEventListener('message', function (e) {
        if (e.data.indexOf('VKDM:') !== -1) {
            var data = JSON.parse(e.data.replace('VKDM:', ''));
            var iframeID = data.iframeID;

            if (data.fileSize) {
                var ttElement = document.querySelector('#' + data.ttElementID);

                ttElement.classList.remove('vkdm_ajax_in_process');
                ttElement.setAttribute('data-file-size', data.fileSize);
                ttElement.setAttribute('data-audio-duration', data.duration);
                ttElement.tt.shown = false;
                ttElement.tt.show();
            }

            setTimeout(function () {
                var iframe = document.querySelector('#' + iframeID);

                iframe.parentNode.removeChild(iframe);
            }, 1000);
        }
    }, false);

    // VKDM (Global)
    window.VKDM = {
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
                                url: items[0][2],
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
                    var url = items[0][2];
                    var fileName = function () {
                        var div = document.createElement('div');

                        div.innerHTML = items[0][4] + ' &ndash; ' + items[0][3];

                        return div.textContent;
                    }();

                    createIframeTransport({
                        url: url,
                        fileName: fileName
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
            var downloadListBtnWrapID = 'vkdm_' + (Math.random().toString(36).replace('.', ''));
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
                var i, prop, match, nSizes;
                var srcArr = [];

                for (i = 0; i < items.length; i++) {
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
                        var fileName = document.title.replace(/"/g, '');

                        downloadListBtnWrap.innerHTML = '\
                            <a href="' + url + '" class="flat_button secondary" download="' + fileName + '.txt">.txt</a>&nbsp;\
                            <a href="' + url + '" class="flat_button secondary" download="' + fileName + '.urls">.urls</a>';
                    } else {
                        downloadListBtnWrap.textContent = 'Не удалось создать файл.';
                    }
                }
            };
            var getAllItems = function () {
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

            showFastBox({title: 'VKDM - Скачать альбом', dark: 1, hideButtons: 1}, '\
                <div style="text-align: center;">\
                    <div style="color: #777;margin-bottom: 20px">Скачать список всех фотографий с альбома:</div>\
                    <div id="' + downloadListBtnWrapID + '"><img src="/images/upload.gif" style="margin-top: 10px; margin-bottom: 7px;" /></div>\
                </div>\
            ');
            getAllItems();
        }
    };

    /*!
     * Helpers
     */
     function createIframeTransport(params) {
        var iframeID = 'vkdm_iframe_' + (Math.random().toString(36).replace('.', ''));
        var data = JSON.stringify(extend({
            iframeID: iframeID
        }, params));
        var host = params.url.match(/(^https?:\/\/[^\/]+)/)[1];
        var src = host + '/404?#vkdm=' + encodeURIComponent(data);
        var iframe = ce('iframe', {id: iframeID, src: src, width: '1', height: '1'}, {visibility : 'hidden'});

        document.body.appendChild(iframe);
    }

    function getJSONP(url, success) {
        var data = null;
        var tempFuncName = 'vkdmFunc' + Date.now();

        window[tempFuncName] = function (response) {
            data = response.response;
            delete window[tempFuncName];
        };

        document.body.appendChild(ce('script', {
            src: url + '&callback=' + tempFuncName,
            onload: function () {
                success(data);
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
            if (createFile.lastBlob) {
                window.URL.revokeObjectURL(createFile.lastBlob);
            }

            url = createFile.lastBlob = window.URL.createObjectURL(new Blob([data], {type: type}));
        }

        return url;
    }
})();