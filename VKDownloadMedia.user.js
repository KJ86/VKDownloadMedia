// ==UserScript==
// @name        VKDownloadMedia
// @namespace   http://vk-download-music.net/
// @version     4.1
// @date        2015-06-10
// @author      KJ86
// @description Скачать фото/аудио/видео-файлы с соц. сети ВКонтакте.
// @homepage    http://vk-download-music.net/
// @downloadURL https://raw.githubusercontent.com/KJ86/VKDownloadMedia/master/VKDownloadMedia.user.js
// @include     *vk*
// @run-at      document-end
// @grant       none
// ==/UserScript==

(function (w, d) {
    if (w.self !== w.top) {
        var regexp = /vkdm=(.*)/i;
        var param = regexp.exec(location.hash);

        if (param === null) return;

        param = JSON.parse(decodeURIComponent(param[1]));

        var a = d.createElement('a');

        a.href = param.url;
        a.download = param.fileName;
        d.body.appendChild(a);
        a.click();
        w.parent.postMessage('Done!', '*');

        return;
    } else if (location.hostname !== 'vk.com') return;

    /**
     * VKDM
     */
    w.VKDM = {};

    VKDM.audioURLList = [];
    VKDM.photoURLList = [];
    VKDM.photoAlbumURLList = [];
    VKDM.patternAudio = /http.*\.mp3/;
    VKDM.patternVideo = /url([0-9]{3,4})=(.*?(\..{3,4})\?extra=.*?)&/g;

    VKDM._createAudioLinks = function (audio, audioLength, newElement) {
        var i, id, mp3, input;
        var audioParentId = audio[0].parentNode.id;

        if (audioParentId === 'initial_list' || audioParentId === 'pad_playlist') {
            newElement.setAttribute('onmouseover', "Audio.rowActive(this, 'Скачать аудиозапись', [9, 5, 0]);");
            newElement.setAttribute('onmouseout', "Audio.rowInactive(this);");
        } else {
            newElement.setAttribute('onmouseover', "showTooltip(this, {text: 'Скачать Аудиозапись', showdt: 0, black: 1, shift: [9, 4, 0]});");
        }

        for (i = 0; i < audioLength; i++) {
            input = geByTag1('input', audio[i]);

            if (!input) continue;

            mp3 = this.patternAudio.exec(input.value);

            if (!mp3) continue;

            this.audioURLList.push(mp3[0]);
            id = audio[i].id.slice(5);

            if (ge('download' + id)) continue;

            newElement.id = 'download' + id;
            geByClass1('actions', audio[i]).appendChild(newElement.cloneNode(true));
        }
    };

    VKDM._createVideoLinks = function (flashvars) {
        var mv_more = ge('mv_more');
        var fragment = cf('<div class="mv_more fl_l" id="mv_download">Скачать</div><div class="mv_rtl_divider fl_l"></div>');

        mv_more.parentNode.insertBefore(fragment, mv_more);

        var param = decodeURIComponent(flashvars);
        var m, ex, items = [];

        while ((m = this.patternVideo.exec(param)) !== null) {
            items.push([m[2], m[1]]);
            ex = m[3];
        }

        new InlineDropdown('mv_download', {
            items: items.reverse(),
            withArrow: true,
            keepTitle: true,
            autoShow: true,
            autoHide: 300,
            sublists: {},
            onSelect: function (url) {
                VKDM.downloadFile(url, ge('mv_title').textContent + ex);
            }
        });
    };

    VKDM._downloadFoundPhoto = function (switchTarget) {
        var photo = ge('content').querySelectorAll('[onclick*="showPhoto("]');

        if (photo.length === 0) return;

        hide(switchTarget);
        show(switchTarget.nextSibling);

        this.photoURLList = [];

        var k = 0;
        var photosID = [];
        var patternPhotoID = /showPhoto\('([0-9_-]+)'/;

        each(photo, function (i, el) {
            photosID.push(patternPhotoID.exec(el.getAttribute('onclick'))[1]);
        });

        photosID = (function (arr) {
            var obj = {};

            for (var i = 0; i < arr.length; i++) {
                obj[arr[i]] = true;
            }

            return Object.keys(obj);
        }(photosID));

        (function getAllPhotos(error) {
            if (error) {
                showDoneBox('<b style="color:red">Ошибка!</b> Не удалось получить данные. Попробуйте еще раз.');
                hide(switchTarget.nextSibling);
                show(switchTarget);
            } else if (k < photosID.length) {
                VKDM.getJSONP('https://api.vk.com/method/photos.getById?photos=' + photosID.slice(k, (k += 100)).join() + '&extended=0&photo_sizes=0&v=5.27&callback=VKDM._createFoundPhotoURLList', getAllPhotos);
            } else {
                VKDM.createFile('text/plain;charset=utf-8', VKDM.photoURLList.join('\r\n'),  VKDM.photoURLList.length + '_найденных фотографий.txt');
                hide(switchTarget.nextSibling);
                show(switchTarget);
            }
        })();
    };

    VKDM._downloadPhotoAlbum = function (switchTarget) {
        var patternAlbumInfo = /^\/album(-?[0-9]+)_([0-9]+)$/;
        var albumID = patternAlbumInfo.exec(location.pathname);

        if (!albumID) return;

        switch (albumID[2]) {
            case '0': albumID[2] = 'profile'; break;
            case '00': albumID[2] = 'wall'; break;
            case '000': albumID[2] = 'saved'; break;
        }

        hide(switchTarget);
        show(switchTarget.nextSibling);

        this.photoAlbumURLList = [];

        var offset = 100;
        var getAllPhotosFromAlbum = function (error) {
            if (error) {
                showDoneBox('<b style="color:red">Ошибка!</b> Не удалось получить данные. Попробуйте еще раз.');
                hide(switchTarget.nextSibling);
                show(switchTarget);
            } else if (offset < VKDM._downloadPhotoAlbum.count) {
                VKDM.getJSONP('https://api.vk.com/method/photos.get?owner_id=' + albumID[1] + '&album_id=' + albumID[2] + '&extended=0&photo_sizes=0&offset=' + offset + '&count=100&v=5.27&callback=VKDM._createPhotoAlbumURLList', getAllPhotosFromAlbum);
                offset += 100;
            } else {
                VKDM.createFile('text/plain;charset=utf-8', VKDM.photoAlbumURLList.join('\r\n'), document.title + '.txt');
                hide(switchTarget.nextSibling);
                show(switchTarget);
            }
        };

        VKDM.getJSONP('https://api.vk.com/method/photos.get?owner_id=' + albumID[1] + '&album_id=' + albumID[2] + '&extended=0&photo_sizes=0&offset=0&count=100&v=5.27&callback=VKDM._createPhotoAlbumURLList', getAllPhotosFromAlbum);
    };

    VKDM._createFoundPhotoURLList = function (result) {
        each(result.response, function (i, el) {
            if (el.photo_2560) VKDM.photoURLList.push(el.photo_2560);
            else if (el.photo_1280) VKDM.photoURLList.push(el.photo_1280);
            else if (el.photo_807) VKDM.photoURLList.push(el.photo_807);
            else if (el.photo_604) VKDM.photoURLList.push(el.photo_604);
            else if (el.photo_130) VKDM.photoURLList.push(el.photo_130);
            else if (el.photo_75) VKDM.photoURLList.push(el.photo_75);
        });
    };

    VKDM._createPhotoAlbumURLList = function (result) {
        this._downloadPhotoAlbum.count = result.response.count;

        each(result.response.items, function (i, el) {
            if (el.photo_2560) VKDM.photoAlbumURLList.push(el.photo_2560);
            else if (el.photo_1280) VKDM.photoAlbumURLList.push(el.photo_1280);
            else if (el.photo_807) VKDM.photoAlbumURLList.push(el.photo_807);
            else if (el.photo_604) VKDM.photoAlbumURLList.push(el.photo_604);
            else if (el.photo_130) VKDM.photoAlbumURLList.push(el.photo_130);
            else if (el.photo_75) VKDM.photoAlbumURLList.push(el.photo_75);
        });
    };

    VKDM.getJSONP = function (url, callback) {
        var script = ce('script', {src: url});

        script.onload = function () {
            callback(false);
            re(this);
        };
        script.onerror = function () {
            callback(true);
            re(this);
        };
        geByTag1('head').appendChild(script);
    };

    VKDM.createFile = function (type, data, fileName) {
        var url;

        if (w.URL && URL.createObjectURL) {
            url = URL.createObjectURL(new Blob([data], {type: type}));

            this.hiddenClick(url, fileName);
            setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 100);
        } else {
            url = 'data:' + type + ',' + encodeURI(data);

            this.hiddenClick(url, fileName);
        }
    };

    VKDM.downloadFile = function (url, fileName) {
        var params = {
            url: url,
            fileName: fileName
        };

        params = encodeURIComponent(JSON.stringify(params));

        var regexp = /(^https?:\/\/[^\/]+)/;
        var host = regexp.exec(url);
        var src = host[1] + '/404?#vkdm=' + params;
        var iframe = ce('iframe', {src: src, width: '1', height: '1'}, {visibility : 'hidden'});

        d.body.appendChild(iframe);

        var listener = function () {
            setTimeout(function () {
                iframe.parentNode.removeChild(iframe);
                w.removeEventListener('message', listener, false);
            }, 1000);
        };

        w.addEventListener('message', listener, false);
    };

    VKDM.hiddenClick = function (url, fileName) {
        var a = ce('a', {
            href: url,
            download: fileName || ''
        });

        d.body.appendChild(a);
        a.click();
        re(a);
    };

    /**
     * init
     */
    (function () {
        geByTag1('head').appendChild(ce('style', {
            type: 'text/css', 
            innerHTML: '\
.audio_download_wrap {margin: 4px 4px 3px 0; padding: 4px; opacity: 0.4; filter: alpha(opacity=40);}\
.audio_download_wrap:hover {opacity: 1 !important; -webkit-transition: opacity .2s; -moz-transition: opacity .2s; -o-transition: opacity .2s; transition: opacity .2s;}\
.audio_download {margin: 0; background: url("data:image/gif;base64,R0lGODlhDQANAIABAF+AnwAAACH5BAEAAAEALAAAAAANAA0AAAIYjAOZx+2n1pstgmlxrDabrnCeKD0hhTgFADs=") 0px 0px no-repeat; width: 13px; height: 13px; position: relative; cursor: pointer; visibility: hidden; overflow: hidden;}\
.audio.over .audio_download {visibility: visible;}\
.audio.over .duration {display: none !important}\
#audio.new .audio_download_wrap {margin: 6px 6px 6px 0; padding: 4px; opacity: 0.4; filter: alpha(opacity=40);}\
#audio.new .audio.over .title_wrap {width: 300px !important}\
#audio.new .audio.current .audio_download, #pad_playlist_panel .audio.current .audio_download {background-image: url("data:image/gif;base64,R0lGODlhDQANAIABAP///////yH5BAEAAAEALAAAAAANAA0AAAIYjAOZx+2n1pstgmlxrDabrnCeKD0hhTgFADs=");}\
#pad_playlist_panel .audio_download_wrap {margin: 7px 7px 7px 0px; padding: 4px;}\
#VKDM_InfoBox {line-height: 1; position: fixed; right: 10px; top: 85px; z-index: 201;}\
#VKDM_InfoBox_ico {background: url("data:image/gif;base64,R0lGODlhDQANAIABAF+AnwAAACH5BAEAAAEALAAAAAANAA0AAAIYjAOZx+2n1pstgmlxrDabrnCeKD0hhTgFADs=") 10px 10px no-repeat #d9e0e8; cursor: pointer; height: 33px; width: 33px; float: right; opacity: 0.70; transition: opacity 200ms ease-out, background 200ms ease-out;}\
#VKDM_InfoBox_ico:hover {opacity: 1;}\
.VKDM_InfoBox_ico_active {background: url("data:image/gif;base64,R0lGODlhDQANAIABAP///////yH5BAEAAAEALAAAAAANAA0AAAIYjAOZx+2n1pstgmlxrDabrnCeKD0hhTgFADs=") 10px 10px no-repeat #5780AB !important; box-shadow: 0 0px 3px rgba(0, 0, 0, 0.2) !important; opacity: 1 !important;}\
#VKDM_InfoBox_content {box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.2); color: #45688E; display: none; margin-right: 2px;}\
#VKDM_InfoBox_content_title {background-color: #5780AB; padding: 11px 22px; text-align: center;}\
#VKDM_InfoBox_content_title a {color: #FFFFFF; font-weight: 700;}\
#VKDM_InfoBox_content_body {background-color: #F2F5F7; border-bottom: 1px solid #D7DADE; border-left: 1px solid #D7DADE; border-right: 1px solid #D7DADE; margin: 0px; padding: 11px 11px 0px;}\
#VKDM_InfoBox_content_body > div {padding-bottom: 11px;}\
#VKDM_audioURLListLength, #VKDM_photoURLListLength {margin-left: 5px;}\
.VKDM_docs_item_icon {background: #e1e7ed url("/images/icons/darr.gif") 8px 7px no-repeat; width: 30px; height: 17px; border-radius: 3px; color: #6A839E; padding: 3px 0px 0px 20px; display: inline-block; line-height: 1.182;}\
.VKDM_docs_item_icon:hover {text-decoration: none;}\
.VKDM_loading {background-color: #E1E7ED; border-radius: 3px; display: inline-block; height: 17px; line-height: 1.182; padding-top: 3px; text-align: center; width: 50px;}\
.VKDM_FastBox_H {color: #36638E; font-size: 1.09em; font-weight: 700; margin-bottom: 17px;}' 
        }));
        document.body.appendChild(ce('div', {
            id: 'VKDM_InfoBox',
            innerHTML: '\
<div id="VKDM_InfoBox_ico" onclick="toggle(ge(\'VKDM_InfoBox_content\')); toggleClass(this, \'VKDM_InfoBox_ico_active\');"></div>\
<div id="VKDM_InfoBox_content" class="fl_l">\
  <div id="VKDM_InfoBox_content_title"><a href="http://vk-download-music.net" target="_blank">VKDownloadMedia 4.1</a></div>\
  <div id="VKDM_InfoBox_content_body">\
    <h2>Найдено</h2>\
    <div>\
      <div class="fl_l"><a href="#" id="VKDM_showAudioDownloader">Аудиозаписей</a>:</div>\
      <div class="fl_r"><b id="VKDM_audioURLListLength">0</b></div>\
      <div class="clear"></div>\
    </div>\
    <div>\
      <div class="fl_l"><a href="#" id="VKDM_showPhotoDownloader">Фотографий</a>:</div>\
      <div class="fl_r"><b id="VKDM_photoURLListLength">0</b></div>\
      <div class="clear"></div>\
    </div>\
  </div>\
</div>'
        }));
        addEvent(ge('VKDM_showAudioDownloader'), 'click', function () {
            if (VKDM.audioURLList.length === 0) {
                showDoneBox('<b>Аудиозаписей не найдено.</b>');
                return false;
            }

            var title = 'Скачать Аудиозаписи';
            var content = '\
<div class="VKDM_FastBox_H">Найдено аудиозаписей: ' + VKDM.audioURLList.length + '</div>\
<p><a onclick="VKDM.createFile(\'audio/x-mpegurl;charset=utf-8\', \'#EXTM3U\\r\\n\' + VKDM.audioURLList.join(\'\\r\\n\'), \'ВКонтакте-плейлист.m3u\')" class="VKDM_docs_item_icon">M3U</a> &ndash; скачать плейлист найденных аудиозаписей.</p>\
<p><a onclick="VKDM.createFile(\'text/plain;charset=utf-8\', VKDM.audioURLList.join(\'\\r\\n\'), VKDM.audioURLList.length + \' найденных аудиозаписей.txt\')"  class="VKDM_docs_item_icon">txt</a> &ndash; скачать список URL-адресов найденных файлов.</p>\
<div class="info_msg">Чтобы скачать все аудиозаписи сразу, импортируйте список URL-адресов в менеджер закачек (рекомендуется <a href="http://www.westbyte.com/dm/" target="_blank">Download Master</a>).</div>';

            showFastBox({title: title, dark: 1, bodyStyle: 'padding: 17px 20px 18px;'}, content);
            return false;
        });
        addEvent(ge('VKDM_showPhotoDownloader'), 'click', function () {
            var photoLength = ge('content').querySelectorAll('[onclick*="showPhoto("]').length;

            if (photoLength === 0) {
                showDoneBox('<b>Фотографий не найдено.</b>');
                return false;
            }

            var title = 'Скачать фотографии';
            var content = '\
<div class="VKDM_FastBox_H">Найдено фотографий: ~' + photoLength + '</div>\
<p><a onclick="VKDM._downloadFoundPhoto(this)" class="VKDM_docs_item_icon">txt</a><span class="VKDM_loading" style="display: none"><img src="/images/upload.gif" /></span> &ndash; скачать список URL-адресов найденных файлов.</p>\
<div class="info_msg">Чтобы скачать все найденные фотографии сразу, импортируйте список URL-адресов в менеджер закачек (рекомендуется <a href="http://www.westbyte.com/dm/" target="_blank">Download Master</a>).</div>';

            showFastBox({title: title, dark: 1, bodyStyle: 'padding: 17px 20px 18px;'}, content);
            return false;
        });

        var preAudioLength = 0;
        var preAudioFirstID = null;
        var prePhotoLength = 0;
        var patternIsAlbum = /^\/album-?[0-9]+_[0-9]+$/;
        var VKDM_audioURLListLength = ge('VKDM_audioURLListLength');
        var VKDM_photoURLListLength = ge('VKDM_photoURLListLength');
        var adw = ce('div', {
            className: 'audio_download_wrap fl_r',
            innerHTML: '<div class="audio_download"></div>'
        });

        adw.setAttribute('onclick', "var audio = ge(this.id.replace('download','audio')); VKDM.downloadFile(geByTag1('input', audio).value, trim(geByClass1('title_wrap', audio).textContent) + '.mp3'); return cancelEvent(event);");

        (function refresh() {
            var audio = geByClass('audio');
            var audioLength = audio.length;
            var photoLength = ge('content').querySelectorAll('[onclick*="showPhoto("]').length;
            var video_player = ge('video_player');

            if (audioLength === 0) {
                if (preAudioLength !== 0) {
                    preAudioLength = 0;
                    preAudioFirstID = null;
                    VKDM.audioURLList = [];
                    VKDM_audioURLListLength.textContent = '0';
                }
            } else if (audio[0].id === preAudioFirstID && audioLength === preAudioLength) {
                /**/
            } else {
                preAudioLength = audioLength;
                preAudioFirstID = audio[0].id;
                VKDM.audioURLList = [];
                VKDM._createAudioLinks(audio, audioLength, adw);
                VKDM_audioURLListLength.textContent = VKDM.audioURLList.length;
            }

            if (photoLength === 0) {
                if (prePhotoLength !== 0) {
                    prePhotoLength = 0;
                    VKDM_photoURLListLength.textContent = '0';
                }
            } else if (photoLength === prePhotoLength) {
                /**/
            } else {
                prePhotoLength = photoLength;
                VKDM_photoURLListLength.textContent = '~' + photoLength;
            }

            if (location.pathname.search(patternIsAlbum) !== -1 && location.search.length === 0) {
                var photos_container = ge('photos_container') && ge('photos_container').parentNode;

                if (photos_container && !ge('VKDM_downloadPhotoAlbum')) {
                    var fragment = cf();

                    fragment.appendChild(ce('span', {className: 'divide', innerHTML: '|'}));
                    fragment.appendChild(ce('span', {innerHTML: '<a id="VKDM_downloadPhotoAlbum">Скачать альбом</a>'}));
                    geByClass1('summary', photos_container).appendChild(fragment);
                    addEvent(ge('VKDM_downloadPhotoAlbum'), 'click', function () {
                        var title = 'Скачать альбом';
                        var content = '\
<div class="VKDM_FastBox_H">' + d.title + '</div>\
<p><a onclick="VKDM._downloadPhotoAlbum(this)" class="VKDM_docs_item_icon">txt</a><span class="VKDM_loading" style="display: none"><img src="/images/upload.gif" /></span> &ndash; скачать список URL-адресов всех фотографий с альбома.</p>\
<div class="info_msg">Чтобы скачать все фотографии сразу, импортируйте список URL-адресов в менеджер закачек (рекомендуется <a href="http://www.westbyte.com/dm/" target="_blank">Download Master</a>).</div>';

                        showFastBox({title: title, dark: 1, bodyStyle: 'padding: 17px 20px 18px;'}, content);
                        return false;
                    });
                }
            } else {
                var VKDM_downloadPhotoAlbum = ge('VKDM_downloadPhotoAlbum');

                if (VKDM_downloadPhotoAlbum) {
                    re(VKDM_downloadPhotoAlbum.parentNode.previousSibling);
                    re(VKDM_downloadPhotoAlbum);
                }
            }

            if (video_player) {
                var flashvars = video_player.getAttribute('flashvars');

                if (!ge('mv_download')) {
                    if (flashvars && flashvars.indexOf('vid=') !== -1) {
                        VKDM._createVideoLinks(flashvars);
                    }
                }
            }

            setTimeout(refresh, 300);
        })();
    })();
})(window, document);
