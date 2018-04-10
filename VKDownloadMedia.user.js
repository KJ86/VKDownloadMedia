// ==UserScript==
// @name        VKDownloadMedia
// @description Скачать фото/аудио/видео-файлы с соц. сети ВКонтакте.
// @namespace   https://github.com/KJ86/VKDownloadMedia
// @version     5.5
// @date        2018-04-10
// @author      KJ86
// @icon        data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjODI4YTk5IiBkPSJtIDEwLDYgaCA0IHYgNiBoIDMgbCAtNSw2IC01LC02IGggMyB6IiBwYWludC1vcmRlcj0ibWFya2VycyBzdHJva2UgZmlsbCIvPjwvc3ZnPg==
// @homepage    https://greasyfork.org/ru/scripts/7385-vkdownloadmedia
// @downloadURL https://greasyfork.org/scripts/7385-vkdownloadmedia/code/VKDownloadMedia.user.js
// @supportURL  https://vk.com/vkdownloadmedia
// @include     *
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function () {
    'use strict';

    // Only vk.com
    if (location.hostname === 'vk.com' && window.self === window.top) {
        (function () {
            /**
             * @function
             * @param {String} selector
             * @param {Function} callback
             * @param {Boolean} isOnce
             */
            var DOMNodeInserted = (function () {
                var _callbacks = [];
                var element = document.documentElement;
                var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

                if (MutationObserver) {
                    (new MutationObserver(function (mutations) {
                        var addedNodes = [];

                        mutations.forEach(function (mutation) {
                            if (mutation.addedNodes.length) {
                                for (var i = 0, l = mutation.addedNodes.length; i < l; i++) {
                                    if (mutation.addedNodes[i].nodeType === Node.ELEMENT_NODE) {
                                        addedNodes.push(mutation.addedNodes[i]);
                                    }
                                }
                            }
                        });

                        if (addedNodes.length) {
                            fire(addedNodes);
                        }
                    })).observe(element, {
                        childList: true,
                        subtree: true
                    });
                } else {
                    // fallback
                    element.addEventListener('DOMNodeInserted', function (e) {
                        if (e.target.nodeType === Node.ELEMENT_NODE) {
                            fire([e.target]);
                        }
                    }, false);
                }

                function fire(addedNodes) {
                    addedNodes.forEach(function (node) {
                        for (var i = 0, l = _callbacks.length; i < l; i++) {
                            var selector = _callbacks[i].selector;
                            var callback = _callbacks[i].callback;
                            var isOnce = _callbacks[i].isOnce;

                            if (matchesSelector(node, selector)) {
                                callback.call(_callbacks, node);

                                if (isOnce) {
                                    _callbacks.splice(i, 1);
                                    return;
                                }
                            }

                            var found = domQuery(selector, node);

                            if (found.length) {
                                for (var j = 0, l2 = found.length; j < l2; j++) {
                                    callback.call(_callbacks, found[j]);

                                    if (isOnce) {
                                        _callbacks.splice(i, 1);
                                        return;
                                    }
                                }
                            }
                        }
                    });
                }

                return function (selector, callback, isOnce) {
                    _callbacks.push({
                        selector: selector,
                        callback: callback,
                        isOnce: !!isOnce
                    });
                };
            })();

            /**
             * @function
             * @param {Object} options
             */
            var iframeTransport = (function () {
                window.addEventListener('message', function (e) {
                    if (typeof e.data === 'string' && e.data.indexOf('VKDM:') !== -1) {
                        var data = JSON.parse(e.data.replace('VKDM:', ''));
                        var iframe = ge(data.iframeID);

                        if (data.callbackName && typeof window[data.callbackName] === 'function') {
                            window[data.callbackName].call(iframe, data);
                            delete window[data.callbackName];
                        }

                        setTimeout(function () {
                            re(iframe);
                        }, 1000);
                    }
                }, false);

                return function (options) {
                    var url = options.url;
                    var data = options.data;
                    var callback = options.onDone;
                    var iframeID = getRandomID('iframe');

                    data.url = url;
                    data.iframeID = iframeID;
                    data.origin = location.protocol + '//' + location.host;

                    if (typeof callback === 'function') {
                        var callbackName = 'vkdmFunc' + Date.now();

                        window[callbackName] = callback;
                        data.callbackName = callbackName;
                    }

                    document.body.appendChild(ce('iframe', {
                        id: iframeID,
                        src: url.split('?')[0] + '.html#vkdm=' + encodeURIComponent(JSON.stringify(data))
                    }, {
                        'visibility': 'hidden',
                        'width': '1px',
                        'height': '1px'
                    }));
                };
            })();

            /**
             * @namespace
             */
            var VKDM = {
                _audioUnmaskSource: function (mask) {
                    var obj = {src: mask};

                    try {
                        AudioPlayerHTML5.prototype._setAudioNodeUrl(obj, mask);
                    } catch(e) {}

                    return obj.src;
                },

                audioShowActionTooltip: function (btn) {
                    var audioRow = domClosest('audio_row', btn);
                    var getTTtext = function () {
                        var duration = data(audioRow, 'vkdm_audio_row_duration');
                        var fileSize = data(audioRow, 'vkdm_audio_row_file_size');
                        var fileSizeMByte = '...';
                        var bitrate = '...';

                        if (duration && fileSize) {
                            fileSizeMByte = (fileSize / 1024 / 1024).toFixed(1) + ' МБ';
                            bitrate = '~' + (fileSize * 8 / duration / 1000).toFixed(0) + ' кбит/с';
                        }

                        return 'Скачать аудиозапись<br>Битрейт: ' + bitrate + '<br>Размер: ' + fileSizeMByte;
                    };

                    if (!data(audioRow, 'vkdm_audio_row_duration') && !btn.classList.contains('vkdm_ajax_in_progress')) {
                        ajax.post('al_audio.php', {
                            act: 'reload_audio',
                            ids: audioRow.getAttribute('data-full-id')
                        }, {
                            onDone: function (items) {
                                var url = VKDM._audioUnmaskSource(items[0][2]);

                                iframeTransport({
                                    url: url,
                                    data: {
                                        action: 'get-size'
                                    },
                                    onDone: function (data) {
                                        window.data(audioRow, 'vkdm_audio_row_duration', parseInt(items[0][5]));
                                        window.data(audioRow, 'vkdm_audio_row_file_size', parseInt(data.fileSize));
                                        
                                        if (document.body.contains(btn)) {
                                            btn.classList.remove('vkdm_ajax_in_progress');
                                            geByClass1('tt_text', btn.tt.container).innerHTML = getTTtext();
                                            tooltips.rePositionTT(btn.tt);
                                        }
                                    }
                                });
                            }
                        });
                        btn.classList.add('vkdm_ajax_in_progress');
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
                            var url = VKDM._audioUnmaskSource(items[0][2]);

                            iframeTransport({
                                url: url,
                                data: {
                                    action: 'download',
                                    fileName: ce('div', {innerHTML: items[0][4] + ' &ndash; ' + items[0][3]}).textContent + getExtension(url)
                                }
                            });
                        }
                    });
                },

                downloadVideo: function (url, fileName) {
                    iframeTransport({
                        url: url,
                        data: {
                            action: 'download',
                            fileName: fileName + getExtension(url)
                        }
                    });
                },

                downloadPhotoAlbumsList: function (el) {
                    var isFastBoxClosed = false;
                    var downloadListBtnWrapID = getRandomID();
                    var fileName = document.title.replace(/"/g, '');
                    var progress = se(getProgressHtml('', 'pr_medium'));

                    setStyle(progress, {
                        'opacity': 1,
                        'padding-top': '11px',
                        'padding-bottom': '12px'
                    });

                    showFastBox({
                        title: 'Скачать альбом',
                        dark: 1,
                        hideButtons: 1,
                        onShow: function () {
                            var items = [];
                            var match = location.pathname.match(/album(-?[0-9]+)_([0-9]+)/);
                            var ownerId = match[1];
                            var albumId = match[2];
                            var count = 1000;
                            var getAllItems = function (offset) {
                                if (isFastBoxClosed === true) return;

                                getJSONP('https://api.vk.com/method/photos.get?owner_id=' + ownerId + '&album_id=' + albumId + '&count=' + count + '&offset=' + offset + '&v=5.53', function (data) {
                                    items = items.concat(data.items);

                                    if (items.length === data.count) {
                                        var srcArr = [];

                                        items.forEach(function (item) {
                                            var nSizes = [];

                                            for (var prop in item) {
                                                var match = prop.match(/photo_(\d+)/);

                                                if (match) {
                                                    nSizes.push(match[1]);
                                                }
                                            }

                                            if (nSizes.length) {
                                                srcArr.push(item['photo_' + Math.max.apply(null, nSizes)]);
                                            }
                                        });

                                        var downloadListBtnWrap = ge(downloadListBtnWrapID);

                                        if (downloadListBtnWrap) {
                                            var url = createFile('text/plain;charset=utf-8', srcArr.join('\r\n'));

                                            downloadListBtnWrap.innerHTML = '<a href="' + url + '" class="flat_button secondary" download="' + fileName + '.txt">Список URL</a>';
                                        }
                                    } else {
                                        getAllItems(offset + count);
                                    }
                                });
                            };

                            switch (albumId) {
                                case '0': albumId = 'profile'; break;
                                case '00': albumId = 'wall'; break;
                                case '000': albumId = 'saved'; break;
                            }

                            getAllItems(0);
                        },
                        onBeforeHide: function () {
                            isFastBoxClosed = true;

                            each(domQuery('#' + downloadListBtnWrapID + ' a'), function (i, el) {
                                (window.URL || window.webkitURL).revokeObjectURL(el.href);
                            });
                        }
                    }, (
                        '<div style="text-align: center;">' +
                        '<h4 class="subheader">' + fileName + '</h4>' +
                        '<div id="' + downloadListBtnWrapID + '">' + progress.outerHTML + '</div>' +
                        '</div>'
                    ));
                },

                downloadCurrentAudioPlayList: function () {
                    var audioIdsArr = [];
                    var isFastBoxClosed = false;
                    var downloadListBtnWrapID = getRandomID();
                    var playListTitle = '';

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
                        var progress = se(getProgressHtml('', 'pr_medium'));

                        setStyle(progress, {
                            'opacity': 1,
                            'padding-top': '11px',
                            'padding-bottom': '12px'
                        });

                        showFastBox({
                            title: 'Скачать плейлист',
                            dark: 1,
                            hideButtons: 1,
                            onShow: function () {
                                var dataArr = [];
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
                                                        '<a href="' + m3uFileURL + '" class="flat_button secondary" download="' + playListTitle + '.m3u8">M3U</a>&nbsp;' +
                                                        '<a href="' + textFileURL + '" class="flat_button secondary" download="' + playListTitle + '.txt">Список URL</a>'
                                                    );
                                                } else {
                                                    downloadListBtnWrap.textContent = 'Не удалось создать файл.';
                                                }
                                            }
                                        }
                                    });
                                };

                                getAudioLinks(audioIdsArr.splice(0, 10));
                            },
                            onBeforeHide: function () {
                                isFastBoxClosed = true;

                                each(domQuery('#' + downloadListBtnWrapID + ' a'), function (i, el) {
                                    (window.URL || window.webkitURL).revokeObjectURL(el.href);
                                });
                            }
                        }, (
                            '<div style="text-align: center;">' +
                            '<h4 class="subheader">' + playListTitle + '</h4>' +
                            '<div id="' + downloadListBtnWrapID + '">' + progress.outerHTML + '</div>' +
                            '</div>'
                        ));
                    }
                }
            };

            /********** INIT **********/

            // Add CSS rules
            document.head.appendChild(ce('style', {
                type: 'text/css',
                textContent: (
                    '.audio_row .audio_row__action_download {background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjODI4YTk5IiBkPSJtIDEwLDYgaCA0IHYgNiBoIDMgbCAtNSw2IC01LC02IGggMyB6IiBwYWludC1vcmRlcj0ibWFya2VycyBzdHJva2UgZmlsbCIvPjwvc3ZnPg==");}' 
                    + '.audio_layer_container .audio_page__footer_download_playlist {float: right; cursor: pointer;}'
                    + '.audio_layer_container .audio_page__footer_download_playlist:hover {text-decoration: underline;}'
                )
            }));

            // Adding audio download button
            DOMNodeInserted('.audio_row:not(.audio_claimed) .audio_row__actions', function (node) {
                var btn = se('<button aria-label="Скачать аудиозапись" data-action="download" class="audio_row__action audio_row__action_download"></button>');

                addEvent(btn, 'click', function (e) {
                    VKDM.downloadAudio(this);
                    cancelEvent(e);
                });
                addEvent(btn, 'mouseover', function () {
                    VKDM.audioShowActionTooltip(this);
                });
                domInsertBefore(btn, node.firstElementChild);
            });

            // Adding video download button
            DOMNodeInserted('#video_player', function () {
                if (Videoview && Videoview.showVideo) {
                    var addAction = function () {
                        try {
                            if (window.mvcur && mvcur.player) {
                                var videoData = mvcur.player.getVars();

                                if (videoData) {
                                    var prop, match;
                                    var items = [];

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
                                        domInsertBefore(se('<div class="mv_more fl_l" id="mv_download">Скачать</div>'), ge('mv_more'));

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
                        } catch (e) {}
                    };
                    var _showVideo = Videoview.showVideo;

                    Videoview.showVideo = function () {
                        _showVideo.apply(this, arguments);
                        addAction();
                    };

                    addAction();
                }
            }, true);

            // Adding photo download button
            DOMNodeInserted('.photos_album_intro_info', (function () {
                var element = geByClass1('photos_album_intro_info');

                if (element) {
                    handler(element);
                }

                function handler(node) {
                    if (!ge('vkdm_download_album')) {
                        var act = se('<a id="vkdm_download_album" href="javascript:;">Скачать альбом</a>');
                        var actWrap = se('<span class="photos_album_info"></span>');

                        addEvent(act, 'click', function () {
                            VKDM.downloadPhotoAlbumsList();
                            return false;
                        });

                        actWrap.appendChild(act);
                        node.appendChild(se('<span class="divide">|</span>'));
                        node.appendChild(actWrap);
                    }
                }

                return handler;
            })());

            // Adding playlist download button
            DOMNodeInserted('#page_header .audio_page__footer_clear_playlist', function (node) {
                var act = se('<span class="audio_page__footer_download_playlist">Скачать плейлист</span>');

                addEvent(act, 'click', function () {
                    VKDM.downloadCurrentAudioPlayList();
                });

                domInsertAfter(act, node);
            });

            /********** HELPERS **********/

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
                var URL = window.URL || window.webkitURL;
                var file = new Blob([data], {type: type});

                return URL.createObjectURL(file);
            }

            function getExtension(url) {
                return url.split('?')[0].match(/\.\w+$/)[0];
            }

            function getRandomID(name) {
                var prefix = 'vkdm' + (name ? '_' + name + '_' : '_');

                return prefix + Math.random().toString().slice(2, 10);
            }
        })();
    } else {
        // iframe actions
        (function () {
            var param = location.hash.match(/vkdm=(.+)/);

            if (param && param[1]) {
                param = JSON.parse(decodeURIComponent(param[1]));

                switch (param.action) {
                    // Download file
                    case 'download':
                        var a = document.createElement('a');

                        a.href = param.url;
                        a.download = param.fileName;

                        document.body.appendChild(a).click();
                        window.top.postMessage('VKDM:' + JSON.stringify(param), param.origin);
                        break;
                    // Get file size
                    case 'get-size':
                        var xhr = new XMLHttpRequest();

                        xhr.open('HEAD', param.url);
                        xhr.onload = function () {
                            param.fileSize = xhr.getResponseHeader('content-length');

                            window.top.postMessage('VKDM:' + JSON.stringify(param), param.origin);
                        };
                        xhr.send();
                        break;
                }
            }
        })();
    }
})();
