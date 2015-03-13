/**
 * @license videogular v1.1.0 http://videogular.com
 * Two Fucking Developers http://twofuckingdevelopers.com
 * License: MIT
 */
/**
 * @ngdoc directive
 * @name com.2fdevs.videogular.plugins.controls.directive:vgControls
 * @restrict E
 * @description
 * scope directive acts as a container and you will need other directives to control the media.
 * Inside scope directive you can add other directives like vg-play-pause-button and vg-scrub-bar.
 *
 * <pre>
 * <videogular vg-theme='config.theme.url'>
 *    <vg-media vg-src='sources'></vg-media>
 *
 *    <vg-controls vg-autohide='config.autohide' vg-autohide-time='config.autohideTime'></vg-controls>
 * </videogular>
 * </pre>
 *
 * @param {boolean=false} vgAutohide Boolean variable or value to activate autohide.
 * @param {number=2000} vgAutohideTime Number variable or value that represents the time in milliseconds that will wait vgControls until it hides.
 *
 *
 */
'use strict';
angular.module('com.benjipott.videogular.plugins.chromecast', [])
    .directive('vgChromecast', ['$timeout', 'VG_STATES', 'VG_UTILS', '$sce',
        function ($timeout, VG_STATES, VG_UTILS, $sce) {
            return {
                restrict: 'A',
                require: '^videogular',
                link: function (scope, elem, attr, API) {

                    scope.API = API;

                    // Very simple chrome detection, not 100% reliable
                    VG_UTILS.isChrome = function () {
                        return (typeof window.orientation !== 'undefined') || (navigator.userAgent.indexOf('Chrome') !== -1);
                    };

                    if (!VG_UTILS.isChrome()) {
                        return;
                    }
                    //Add API Methods
                    API.toggleCasting = function () {
                        if (scope.isCasting) {
                            return scope.stopCasting();
                        } else {
                            return scope.doLaunch();
                        }
                    };

                    API.isCasting = false;
                    API.castInitialized = false;
                    API.canCast = false;

                    /**
                     * Cast popup infos
                     * @type {{title: (string|string), description: string}}
                     */
                    scope.metadata = {
                        title: attr.title,
                        description: attr.description
                    };

                    if (API.isConfig) {
                        scope.$watch('API.config',
                            function () {
                                if (scope.API.config) {
                                    scope.metadata.poster = scope.API.config.plugins.poster.url;
                                }
                            }
                        );
                    }


                    scope.addClass = function (value) {
                        //TODO ajouter la classe a l'element
                    };

                    scope.initializeApi = function () {

                        var apiConfig, appId, sessionRequest;
                        if (!chrome.cast || !chrome.cast.isAvailable) {
                            console.log('Cast APIs not available. Retrying...');
                            setTimeout(scope.initializeApi.bind(scope), 1000);
                            return;
                        }

                        console.log('Cast APIs are available');
                        appId = scope.vgChromecast || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
                        sessionRequest = new chrome.cast.SessionRequest(appId);
                        apiConfig = new chrome.cast.ApiConfig(sessionRequest, scope.sessionJoinedListener, scope.receiverListener.bind(scope));
                        chrome.cast.initialize(apiConfig, scope.onInitSuccess.bind(scope), scope.castError);
                    };

                    scope.sessionJoinedListener = function (session) {
                        return console.log('Session joined');
                    };

                    scope.receiverListener = function (availability) {
                        if (availability === 'available') {
                            return API.canCast = true;
                        }
                    };

                    scope.onInitSuccess = function () {
                        return API.castInitialized = true;
                    };

                    scope.castError = function (castError) {
                        return console.log('Cast Error: ' + (JSON.stringify(castError)));
                    };

                    scope.doLaunch = function () {
                        console.log('Cast video: ' + (scope.currentSrc()));
                        if (API.castInitialized) {
                            return chrome.cast.requestSession(scope.onSessionSuccess.bind(scope), scope.castError);
                        } else {
                            return console.log('Session not initialized');
                        }
                    };

                    scope.onSessionSuccess = function (session) {
                        var image, key, loadRequest, mediaInfo, value, _ref;
                        console.log('Session initialized: ' + session.sessionId);
                        scope.apiSession = session;
                        scope.addClass('connected');
                        mediaInfo = new chrome.cast.media.MediaInfo(scope.currentSrc(), scope.currentType());
                        if (scope.metadata) {
                            mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
                            _ref = scope.metadata;
                            for (key in _ref) {
                                value = _ref[key];
                                mediaInfo.metadata[key] = value;
                            }

                            if (scope.metadata.poster) {
                                image = new chrome.cast.Image(scope.metadata.poster);
                                mediaInfo.metadata.images = [image];
                            }
                        }
                        loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
                        loadRequest.autoplay = true;
                        loadRequest.currentTime = API.currentTime;
                        scope.apiSession.loadMedia(loadRequest, scope.onMediaDiscovered.bind(scope), scope.castError);
                        return scope.apiSession.addUpdateListener(scope.onSessionUpdate.bind(scope));
                    };

                    scope.onMediaDiscovered = function (media) {
                        scope.apiMedia = media;
                        scope.apiMedia.addUpdateListener(scope.onMediaStatusUpdate.bind(scope));
                        scope.startProgressTimer(scope.incrementMediaTime.bind(scope));
                        //scope.player_.loadTech('ChromecastTech', {
                        //    receiver: scope.apiSession.receiver.friendlyName
                        //});
                        scope.casting = true;
                        scope.paused = API.currentState === 'pause';
                        return true;
                    };

                    scope.onSessionUpdate = function (isAlive) {
                        if (!scope.apiMedia) {
                            return;
                        }
                        if (!isAlive) {
                            return scope.onStopAppSuccess();
                        }
                    };

                    scope.onMediaStatusUpdate = function (isAlive) {
                        if (!scope.apiMedia) {
                            return;
                        }
                        scope.currentMediaTime = scope.apiMedia.currentTime;
                        switch (scope.apiMedia.playerState) {
                            case chrome.cast.media.PlayerState.IDLE:
                                scope.currentMediaTime = 0;
                                scope.trigger('timeupdate');
                                return scope.onStopAppSuccess();
                            case chrome.cast.media.PlayerState.PAUSED:
                                if (scope.paused) {
                                    return;
                                }
                                API.pause();
                                return scope.paused = true;
                            case chrome.cast.media.PlayerState.PLAYING:
                                if (!scope.paused) {
                                    return;
                                }
                                API.play();
                                return scope.paused = false;
                        }
                    };

                    scope.startProgressTimer = function (callback) {
                        if (scope.timer) {
                            clearInterval(scope.timer);
                            scope.timer = null;
                        }
                        return scope.timer = setInterval(callback.bind(scope), scope.timerStep);
                    };

                    scope.play = function () {
                        if (!scope.apiMedia) {
                            return;
                        }
                        if (scope.paused) {
                            scope.apiMedia.play(null, scope.mediaCommandSuccessCallback.bind(scope, 'Playing: ' + scope.apiMedia.sessionId), scope.onError);
                            return scope.paused = false;
                        }
                    };

                    scope.pause = function () {
                        if (!scope.apiMedia) {
                            return;
                        }
                        if (!scope.paused) {
                            scope.apiMedia.pause(null, scope.mediaCommandSuccessCallback.bind(scope, 'Paused: ' + scope.apiMedia.sessionId), scope.onError);
                            return scope.paused = true;
                        }
                    };

                    scope.seekMedia = function (position) {
                        var request;
                        request = new chrome.cast.media.SeekRequest();
                        request.currentTime = position;
                        //if (scope.player_.controlBar.progressControl.seekBar.videoWasPlaying) {
                        request.resumeState = chrome.cast.media.ResumeState.PLAYBACK_START;
                        //}
                        return scope.apiMedia.seek(request, scope.onSeekSuccess.bind(scope, position), scope.onError);
                    };

                    scope.onSeekSuccess = function (position) {
                        return scope.currentMediaTime = position;
                    };

                    scope.setMediaVolume = function (level, mute) {
                        var request, volume;
                        if (!scope.apiMedia) {
                            return;
                        }
                        volume = new chrome.cast.Volume();
                        volume.level = level;
                        volume.muted = mute;
                        scope.currentVolume = volume.level;
                        scope.muted = mute;
                        request = new chrome.cast.media.VolumeRequest();
                        request.volume = volume;
                        scope.apiMedia.setVolume(request, scope.mediaCommandSuccessCallback.bind(scope, 'Volume changed'), scope.onError);
                        return API.vgUpdateVolume(volume);
                    };

                    scope.incrementMediaTime = function () {
                        if (scope.apiMedia.playerState !== chrome.cast.media.PlayerState.PLAYING) {
                            return;
                        }
                        if (scope.currentMediaTime < scope.apiMedia.media.duration) {
                            scope.currentMediaTime += 1;
                            return scope.trigger('timeupdate');
                        } else {
                            scope.currentMediaTime = 0;
                            return clearInterval(scope.timer);
                        }
                    };

                    scope.mediaCommandSuccessCallback = function (information, event) {
                        return console.log(information);
                    };

                    scope.onError = function () {
                        return console.log('error');
                    };

                    scope.stopCasting = function () {
                        return scope.apiSession.stop(scope.onStopAppSuccess.bind(scope), scope.onError);
                    };

                    scope.onStopAppSuccess = function () {
                        clearInterval(scope.timer);
                        scope.casting = false;
                        scope.removeClass('connected');
                        API.changeSource(API.sources);
                        if (!scope.paused) {
                            //scope.player_.one('seeked', function () {
                            //    return scope.player_.play();
                            //});
                            return API.play();
                        }
                        //scope.player_.currentTime(scope.currentMediaTime);
                        //scope.player_.tech.setControls(false);
                        //scope.player_.options_.inactivityTimeout = scope.inactivityTimeout;
                        scope.apiMedia = null;
                        return scope.apiSession = null;
                    };
                    /**
                     * Get current source
                     * @type {null}
                     * @private
                     */
                    scope.currentSrc_ = null;
                    scope.currentSrc = function (url) {
                        if (url !== undefined) {
                            scope.currentSrc_ = url
                        }
                        return scope.currentSrc_;
                    };
                    /**
                     * Return video type mime
                     */
                    scope.currentType_ = null;
                    scope.currentType = function (type) {
                        if (type !== undefined) {
                            scope.currentType_ = type
                        }
                        return scope.currentType_;
                    };

                    scope.$watch(
                        function () {
                            return API.sources;
                        },
                        function (newVal) {
                            scope.currentSrc(newVal[0].src);
                            scope.currentType(newVal[0].type);
                        }
                    );
                    /**
                     * Load chromecast api
                     */
                    scope.initializeApi();
                }
            }
        }
    ])
;

/**
 * @ngdoc directive
 * @name com.benjipott.videogular.plugins.chromecast.directive:vgChromecastButton
 * @restrict E
 * @description
 * Directive to switch between chromecast and normal mode.
 *
 * <pre>
 * <videogular vg-theme='config.theme.url'>
 *    <vg-media vg-src='sources'></vg-media>
 *
 *    <vg-controls vg-autohide='config.autohide' vg-autohide-time='config.autohideTime'>
 *        <vg-chromecast-button></vg-chromecast-button>
 *    </vg-controls>
 * </videogular>
 * </pre>
 *
 */
angular.module('com.benjipott.videogular.plugins.chromecast')
    .run(
    ['$templateCache',
        function ($templateCache) {
            $templateCache.put('vg-templates/vg-chromecast-button',
                '<button class="iconButton" ng-click="onClickCast()" ng-class="chromecastIcon" aria-label="Toggle chromecast" type="button"> </button>');
        }
    ]
)
    .directive('vgChromecastButton', [
        function () {
            return {
                restrict: 'E',
                require: '^videogular',
                scope: {},
                templateUrl: function (elem, attrs) {
                    return attrs.vgTemplate || 'vg-templates/vg-chromecast-button';
                },
                link: function (scope, elem, attr, API) {
                    scope.onChangeCasting = function (canCast) {
                        scope.chromecastIcon = {
                            enter: canCast,
                            exit: !canCast
                        };
                    };

                    scope.onClickCast = function () {
                        API.toggleCasting();
                    };

                    scope.chromecastIcon = {
                        enter: false
                    };

                    /*scope.$watch(
                     function () {
                     return API.isCasting;
                     },
                     function (newVal, oldVal) {
                     if (newVal != oldVal) {
                     scope.onChangeCasting(newVal);
                     }
                     }
                     );*/
                    scope.$watch(
                        function () {
                            return API.castInitialized && API.canCast;
                        },
                        function (newVal, oldVal) {
                            if (newVal != oldVal) {
                                scope.onChangeCasting(newVal);
                            }
                        }
                    );
                }
            }
        }
    ]);
