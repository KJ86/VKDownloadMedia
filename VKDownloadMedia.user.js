// ==UserScript==
// @name        VKDownloadMedia
// @description Скачать фото/аудио/видео-файлы с соц. сети ВКонтакте.
// @namespace   https://github.com/KJ86/VKDownloadMedia
// @version     5.4
// @date        2017-06-28
// @author      KJ86
// @icon        data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDYuMzQ5OTk5OSA2LjM0OTk5OTkiPjxnIGZpbGw9IiM4MjhhOTkiPjxwYXRoIGQ9Im0gMi42NDU4MzMsMS41ODc0OTk5IGMgMC41MjkxNjcsMTBlLTggLTEuMzU0MzkxMyw4ZS03IDEuMDU4MzMzNiwxMGUtOCB2IDEuMzIyOTE2NiBoIDAuNzkzNzUgTCAzLjE3NSw0LjQ5NzkxNjYgMS44NTIwODMsMi45MTA0MTY2IGggMC43OTM3NSB6IiAvPjxwYXRoIGQ9Ik0gMS44NTIwODMsNC40OTc5MTY2IEggMS41ODc0OTk3IHYgMC41MjkxNjY2IGwgMy4xNzUwMDAyLDFlLTcgViA0LjQ5NzkxNjYgSCA0LjQ5NzkxNjYgdiAwLjI2NDU4MzMgbCAtMi42NDU4MzM2LDAgeiIgLz48L2c+PC9zdmc+
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

            switch (param.action) {
                // Download file
                case 'download':
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

                    a.href = param.url.split('?')[0];
                    a.download = param.fileName + '.' + fileExtension;

                    document.body.appendChild(a).click();
                    window.top.postMessage('VKDM:' + JSON.stringify(param), '*');
                    break;

                // Get file size
                case 'get-size':
                    var xhr = new XMLHttpRequest();

                    xhr.open('HEAD', param.url);
                    xhr.onload = function () {
                        param.fileSize = xhr.getResponseHeader('content-length');

                        window.top.postMessage('VKDM:' + JSON.stringify(param), '*');
                    };
                    xhr.send();
                    break;
            }
        }

        return;
    }

    // Only on vk.com
    if (location.hostname !== 'vk.com') return;

    // Add CSS rules
    document.head.appendChild(ce('style', {
        type: 'text/css',
        textContent: (
            '.audio_row .audio_row__action_download {background-image: url(data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDYuMzQ5OTk5OSA2LjM0OTk5OTkiPjxnIGZpbGw9IiM4MjhhOTkiPjxwYXRoIGQ9Im0gMi42NDU4MzMsMS41ODc0OTk5IGMgMC41MjkxNjcsMTBlLTggLTEuMzU0MzkxMyw4ZS03IDEuMDU4MzMzNiwxMGUtOCB2IDEuMzIyOTE2NiBoIDAuNzkzNzUgTCAzLjE3NSw0LjQ5NzkxNjYgMS44NTIwODMsMi45MTA0MTY2IGggMC43OTM3NSB6IiAvPjxwYXRoIGQ9Ik0gMS44NTIwODMsNC40OTc5MTY2IEggMS41ODc0OTk3IHYgMC41MjkxNjY2IGwgMy4xNzUwMDAyLDFlLTcgViA0LjQ5NzkxNjYgSCA0LjQ5NzkxNjYgdiAwLjI2NDU4MzMgbCAtMi42NDU4MzM2LDAgeiIgLz48L2c+PC9zdmc+);}' +
            '.audio_layer_container .audio_page__footer_download_playlist {float: right; cursor: pointer;}' +
            '.audio_layer_container .audio_page__footer_download_playlist:hover {text-decoration: underline;}'
        )
    }));

    // Iframe transport handler
    window.addEventListener('message', function (e) {
        if (e.data.indexOf('VKDM:') !== -1) {
            var data = JSON.parse(e.data.replace('VKDM:', ''));
            var iframe = ge(data.iframeID);

            if (data.callback && typeof window[data.callback] === 'function') {
                window[data.callback].call(iframe, data);
                delete window[data.callback];
            }

            setTimeout(function () {
                re(iframe);
            }, 1000);
        }
    }, false);

    // Add download button
    setInterval(function () {
        var isDwnlPlBtnAdd = false;

        return function () {
            // Audio
            var audioRowActions = geByClass1('audio_row__actions');

            if (audioRowActions) {
                var audioRow = domClosest('audio_row', audioRowActions);

                if (hasClass(audioRow, 'audio_claimed') === false) {
                    var downloadAction = geByClass1('audio_row__action_download', audioRowActions);

                    if (!downloadAction) {
                        downloadAction = se('<button aria-label="Скачать аудиозапись" data-action="download" class="audio_row__action audio_row__action_download" onmouseover="VKDM.audioShowActionTooltip(this)"></button>');

                        downloadAction.addEventListener('click', function (e) {
                            VKDM.downloadAudio(this);
                            cancelEvent(e);
                        });
                        audioRowActions.insertBefore(downloadAction, audioRowActions.firstElementChild);
                    }
                }
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
            if (isDwnlPlBtnAdd === false && ap._currentPlaylist) {
                var dwnlPlBtn = ce('span', {
                    className: 'audio_page__footer_download_playlist _audio_page__footer_download_playlist',
                    innerHTML: 'Скачать плейлист'
                });

                dwnlPlBtn.setAttribute('onclick', 'VKDM.downloadCurrentAudioPlayList()');

                domInsertAfter(dwnlPlBtn, geByClass1('_audio_page__footer_clear_playlist'));

                if (dwnlPlBtn.parentNode) {
                    isDwnlPlBtnAdd = true;
                }
            }
        };
    }(), 300);

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
            var getTTtext = function () {
                var duration = btn.getAttribute('data-audio-duration');
                var fileSizeByte = btn.getAttribute('data-file-size');
                var fileSizeMByte = 0;
                var bitrate = 0;

                if (duration && fileSizeByte) {
                    fileSizeMByte = (fileSizeByte / 1024 / 1024).toFixed(1);
                    bitrate = parseInt(fileSizeByte * 8 / duration / 1000);
                }

                return 'Скачать аудиозапись<br>Битрейт: ~' + bitrate + ' кбит/с<br>Размер: ' + fileSizeMByte + ' МБ';
            };

            if (!btn.hasAttribute('data-file-size') && !btn.classList.contains('vkdm_ajax_in_process')) {
                ajax.post('al_audio.php', {
                    act: 'reload_audio',
                    ids: domClosest('audio_row', btn).getAttribute('data-full-id')
                }, {
                    onDone: function (items) {
                        var urlMask = items[0][2];
                        var duration = items[0][5];

                        iframeTransport({
                            action: 'get-size',
                            url: VKDM._audioUnmaskSource(urlMask)
                        }, function (data) {
                            btn.classList.remove('vkdm_ajax_in_process');
                            btn.setAttribute('data-file-size', data.fileSize);
                            btn.setAttribute('data-audio-duration', duration);

                            geByClass1('tt_text', btn.tt.container).innerHTML = getTTtext();
                            tooltips.rePositionTT(btn.tt);
                        });
                    }
                });
                btn.classList.add('vkdm_ajax_in_process');
            }

            showTooltip(btn, {
                text: getTTtext,
                black: 1,
                shift: [7, 5, 0],
                needLeft: true
            });
        },

        downloadAudio: function (btn) {
            ajax.post('al_audio.php', {
                act: 'reload_audio',
                ids: domClosest('audio_row', btn).getAttribute('data-full-id')
            }, {
                onDone: function (items) {
                    iframeTransport({
                        action: 'download',
                        url: VKDM._audioUnmaskSource(items[0][2]),
                        fileName: ce('div', {innerHTML: items[0][4] + ' &ndash; ' + items[0][3]}).textContent
                    });
                }
            });
        },

        downloadVideo: function (url, fileName) {
            iframeTransport({
                action: 'download',
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
                        downloadListBtnWrap.innerHTML = (
                            '<a href="' + url + '" class="flat_button secondary" download="' + fileName + '.txt">.txt</a>&nbsp;' +
                            '<a href="' + url + '" class="flat_button secondary" download="' + fileName + '.urls">.urls</a>'
                        );
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
            }, (
                '<div style="text-align: center;">' +
                '<div style="color: #777;margin-bottom: 20px">' +
                'Скачать список всех фотографий с альбома:' +
                '<br><b>' + fileName + '</b>' +
                '<br><i>(может занят продолжительное время)</i>' +
                '</div>' +
                '<div id="' + downloadListBtnWrapID + '"><img src="/images/upload.gif" style="margin-top: 10px; margin-bottom: 7px;" /></div>' +
                '</div>'
            ));
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
                                downloadListBtnWrap.innerHTML = (
                                    '<a href="' + m3uFileURL + '" class="flat_button secondary" download="' + playListTitle + '.m3u8">.M3U</a>&nbsp;' +
                                    '<a href="' + textFileURL + '" class="flat_button secondary" download="' + playListTitle + '.txt">.txt</a>&nbsp;' +
                                    '<a href="' + textFileURL + '" class="flat_button secondary" download="' + playListTitle + '.urls">.urls</a>'
                                );
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
                }, (
                    '<div style="text-align: center;">' +
                    '<div style="color: #777;margin-bottom: 20px">' +
                    'Скачать плейлист:' +
                    '<br><b>' + playListTitle + '</b>' +
                    '<br><i>(может занят продолжительное время)</i>' +
                    '</div>' +
                    '<div id="' + downloadListBtnWrapID + '"><img src="/images/upload.gif" style="margin-top: 10px; margin-bottom: 7px;" /></div>' +
                    '</div>'
                ));
                getAudioLinks(audioIdsArr.splice(0, 10));
            }
        }
    };

    /*!
     * Helpers
     */
     function iframeTransport(params, callback) {
        var url = params.url;
        var iframeID = getRandomID('iframe');
        var data = extend({
            iframeID: iframeID
        }, params);

        if (typeof callback === 'function') {
            var callBackFuncName = 'vkdmFunc' + Date.now();

            data.callback = callBackFuncName;
            window[callBackFuncName] = callback;
        }

        var src = url.split(/\.([^\.]+?)\?/)[0] + '.html?#vkdm=' + encodeURIComponent(JSON.stringify(data));
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
