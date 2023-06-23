(function () {
    'use strict';

    const PACKET_TYPES = Object.create(null); // no Map = no polyfill
    PACKET_TYPES["open"] = "0";
    PACKET_TYPES["close"] = "1";
    PACKET_TYPES["ping"] = "2";
    PACKET_TYPES["pong"] = "3";
    PACKET_TYPES["message"] = "4";
    PACKET_TYPES["upgrade"] = "5";
    PACKET_TYPES["noop"] = "6";
    const PACKET_TYPES_REVERSE = Object.create(null);
    Object.keys(PACKET_TYPES).forEach(key => {
        PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
    });
    const ERROR_PACKET = { type: "error", data: "parser error" };

    const withNativeBlob$1 = typeof Blob === "function" ||
        (typeof Blob !== "undefined" &&
            Object.prototype.toString.call(Blob) === "[object BlobConstructor]");
    const withNativeArrayBuffer$2 = typeof ArrayBuffer === "function";
    // ArrayBuffer.isView method is not defined in IE10
    const isView$1 = obj => {
        return typeof ArrayBuffer.isView === "function"
            ? ArrayBuffer.isView(obj)
            : obj && obj.buffer instanceof ArrayBuffer;
    };
    const encodePacket = ({ type, data }, supportsBinary, callback) => {
        if (withNativeBlob$1 && data instanceof Blob) {
            if (supportsBinary) {
                return callback(data);
            }
            else {
                return encodeBlobAsBase64(data, callback);
            }
        }
        else if (withNativeArrayBuffer$2 &&
            (data instanceof ArrayBuffer || isView$1(data))) {
            if (supportsBinary) {
                return callback(data);
            }
            else {
                return encodeBlobAsBase64(new Blob([data]), callback);
            }
        }
        // plain string
        return callback(PACKET_TYPES[type] + (data || ""));
    };
    const encodeBlobAsBase64 = (data, callback) => {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            const content = fileReader.result.split(",")[1];
            callback("b" + (content || ""));
        };
        return fileReader.readAsDataURL(data);
    };

    // imported from https://github.com/socketio/base64-arraybuffer
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    // Use a lookup table to find the index.
    const lookup$1 = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
        lookup$1[chars.charCodeAt(i)] = i;
    }
    const decode$1 = (base64) => {
        let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
        if (base64[base64.length - 1] === '=') {
            bufferLength--;
            if (base64[base64.length - 2] === '=') {
                bufferLength--;
            }
        }
        const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
        for (i = 0; i < len; i += 4) {
            encoded1 = lookup$1[base64.charCodeAt(i)];
            encoded2 = lookup$1[base64.charCodeAt(i + 1)];
            encoded3 = lookup$1[base64.charCodeAt(i + 2)];
            encoded4 = lookup$1[base64.charCodeAt(i + 3)];
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
        return arraybuffer;
    };

    const withNativeArrayBuffer$1 = typeof ArrayBuffer === "function";
    const decodePacket = (encodedPacket, binaryType) => {
        if (typeof encodedPacket !== "string") {
            return {
                type: "message",
                data: mapBinary(encodedPacket, binaryType)
            };
        }
        const type = encodedPacket.charAt(0);
        if (type === "b") {
            return {
                type: "message",
                data: decodeBase64Packet(encodedPacket.substring(1), binaryType)
            };
        }
        const packetType = PACKET_TYPES_REVERSE[type];
        if (!packetType) {
            return ERROR_PACKET;
        }
        return encodedPacket.length > 1
            ? {
                type: PACKET_TYPES_REVERSE[type],
                data: encodedPacket.substring(1)
            }
            : {
                type: PACKET_TYPES_REVERSE[type]
            };
    };
    const decodeBase64Packet = (data, binaryType) => {
        if (withNativeArrayBuffer$1) {
            const decoded = decode$1(data);
            return mapBinary(decoded, binaryType);
        }
        else {
            return { base64: true, data }; // fallback for old browsers
        }
    };
    const mapBinary = (data, binaryType) => {
        switch (binaryType) {
            case "blob":
                return data instanceof ArrayBuffer ? new Blob([data]) : data;
            case "arraybuffer":
            default:
                return data; // assuming the data is already an ArrayBuffer
        }
    };

    const SEPARATOR = String.fromCharCode(30); // see https://en.wikipedia.org/wiki/Delimiter#ASCII_delimited_text
    const encodePayload = (packets, callback) => {
        // some packets may be added to the array while encoding, so the initial length must be saved
        const length = packets.length;
        const encodedPackets = new Array(length);
        let count = 0;
        packets.forEach((packet, i) => {
            // force base64 encoding for binary packets
            encodePacket(packet, false, encodedPacket => {
                encodedPackets[i] = encodedPacket;
                if (++count === length) {
                    callback(encodedPackets.join(SEPARATOR));
                }
            });
        });
    };
    const decodePayload = (encodedPayload, binaryType) => {
        const encodedPackets = encodedPayload.split(SEPARATOR);
        const packets = [];
        for (let i = 0; i < encodedPackets.length; i++) {
            const decodedPacket = decodePacket(encodedPackets[i], binaryType);
            packets.push(decodedPacket);
            if (decodedPacket.type === "error") {
                break;
            }
        }
        return packets;
    };
    const protocol$1 = 4;

    /**
     * Initialize a new `Emitter`.
     *
     * @api public
     */

    function Emitter(obj) {
      if (obj) return mixin(obj);
    }

    /**
     * Mixin the emitter properties.
     *
     * @param {Object} obj
     * @return {Object}
     * @api private
     */

    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }

    /**
     * Listen on the given `event` with `fn`.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.on =
    Emitter.prototype.addEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};
      (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
        .push(fn);
      return this;
    };

    /**
     * Adds an `event` listener that will be invoked a single
     * time then automatically removed.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.once = function(event, fn){
      function on() {
        this.off(event, on);
        fn.apply(this, arguments);
      }

      on.fn = fn;
      this.on(event, on);
      return this;
    };

    /**
     * Remove the given callback for `event` or all
     * registered callbacks.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */

    Emitter.prototype.off =
    Emitter.prototype.removeListener =
    Emitter.prototype.removeAllListeners =
    Emitter.prototype.removeEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};

      // all
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }

      // specific event
      var callbacks = this._callbacks['$' + event];
      if (!callbacks) return this;

      // remove all handlers
      if (1 == arguments.length) {
        delete this._callbacks['$' + event];
        return this;
      }

      // remove specific handler
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }

      // Remove event specific arrays for event types that no
      // one is subscribed for to avoid memory leak.
      if (callbacks.length === 0) {
        delete this._callbacks['$' + event];
      }

      return this;
    };

    /**
     * Emit `event` with the given args.
     *
     * @param {String} event
     * @param {Mixed} ...
     * @return {Emitter}
     */

    Emitter.prototype.emit = function(event){
      this._callbacks = this._callbacks || {};

      var args = new Array(arguments.length - 1)
        , callbacks = this._callbacks['$' + event];

      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }

      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }

      return this;
    };

    // alias used for reserved events (protected method)
    Emitter.prototype.emitReserved = Emitter.prototype.emit;

    /**
     * Return array of callbacks for `event`.
     *
     * @param {String} event
     * @return {Array}
     * @api public
     */

    Emitter.prototype.listeners = function(event){
      this._callbacks = this._callbacks || {};
      return this._callbacks['$' + event] || [];
    };

    /**
     * Check if this emitter has `event` handlers.
     *
     * @param {String} event
     * @return {Boolean}
     * @api public
     */

    Emitter.prototype.hasListeners = function(event){
      return !! this.listeners(event).length;
    };

    const globalThisShim = (() => {
        if (typeof self !== "undefined") {
            return self;
        }
        else if (typeof window !== "undefined") {
            return window;
        }
        else {
            return Function("return this")();
        }
    })();

    function pick(obj, ...attr) {
        return attr.reduce((acc, k) => {
            if (obj.hasOwnProperty(k)) {
                acc[k] = obj[k];
            }
            return acc;
        }, {});
    }
    // Keep a reference to the real timeout functions so they can be used when overridden
    const NATIVE_SET_TIMEOUT = globalThisShim.setTimeout;
    const NATIVE_CLEAR_TIMEOUT = globalThisShim.clearTimeout;
    function installTimerFunctions(obj, opts) {
        if (opts.useNativeTimers) {
            obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThisShim);
            obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThisShim);
        }
        else {
            obj.setTimeoutFn = globalThisShim.setTimeout.bind(globalThisShim);
            obj.clearTimeoutFn = globalThisShim.clearTimeout.bind(globalThisShim);
        }
    }
    // base64 encoded buffers are about 33% bigger (https://en.wikipedia.org/wiki/Base64)
    const BASE64_OVERHEAD = 1.33;
    // we could also have used `new Blob([obj]).size`, but it isn't supported in IE9
    function byteLength(obj) {
        if (typeof obj === "string") {
            return utf8Length(obj);
        }
        // arraybuffer or blob
        return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
    }
    function utf8Length(str) {
        let c = 0, length = 0;
        for (let i = 0, l = str.length; i < l; i++) {
            c = str.charCodeAt(i);
            if (c < 0x80) {
                length += 1;
            }
            else if (c < 0x800) {
                length += 2;
            }
            else if (c < 0xd800 || c >= 0xe000) {
                length += 3;
            }
            else {
                i++;
                length += 4;
            }
        }
        return length;
    }

    class TransportError extends Error {
        constructor(reason, description, context) {
            super(reason);
            this.description = description;
            this.context = context;
            this.type = "TransportError";
        }
    }
    class Transport extends Emitter {
        /**
         * Transport abstract constructor.
         *
         * @param {Object} opts - options
         * @protected
         */
        constructor(opts) {
            super();
            this.writable = false;
            installTimerFunctions(this, opts);
            this.opts = opts;
            this.query = opts.query;
            this.socket = opts.socket;
        }
        /**
         * Emits an error.
         *
         * @param {String} reason
         * @param description
         * @param context - the error context
         * @return {Transport} for chaining
         * @protected
         */
        onError(reason, description, context) {
            super.emitReserved("error", new TransportError(reason, description, context));
            return this;
        }
        /**
         * Opens the transport.
         */
        open() {
            this.readyState = "opening";
            this.doOpen();
            return this;
        }
        /**
         * Closes the transport.
         */
        close() {
            if (this.readyState === "opening" || this.readyState === "open") {
                this.doClose();
                this.onClose();
            }
            return this;
        }
        /**
         * Sends multiple packets.
         *
         * @param {Array} packets
         */
        send(packets) {
            if (this.readyState === "open") {
                this.write(packets);
            }
        }
        /**
         * Called upon open
         *
         * @protected
         */
        onOpen() {
            this.readyState = "open";
            this.writable = true;
            super.emitReserved("open");
        }
        /**
         * Called with data.
         *
         * @param {String} data
         * @protected
         */
        onData(data) {
            const packet = decodePacket(data, this.socket.binaryType);
            this.onPacket(packet);
        }
        /**
         * Called with a decoded packet.
         *
         * @protected
         */
        onPacket(packet) {
            super.emitReserved("packet", packet);
        }
        /**
         * Called upon close.
         *
         * @protected
         */
        onClose(details) {
            this.readyState = "closed";
            super.emitReserved("close", details);
        }
        /**
         * Pauses the transport, in order not to lose packets during an upgrade.
         *
         * @param onPause
         */
        pause(onPause) { }
    }

    // imported from https://github.com/unshiftio/yeast
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split(''), length = 64, map = {};
    let seed = 0, i = 0, prev;
    /**
     * Return a string representing the specified number.
     *
     * @param {Number} num The number to convert.
     * @returns {String} The string representation of the number.
     * @api public
     */
    function encode$1(num) {
        let encoded = '';
        do {
            encoded = alphabet[num % length] + encoded;
            num = Math.floor(num / length);
        } while (num > 0);
        return encoded;
    }
    /**
     * Yeast: A tiny growing id generator.
     *
     * @returns {String} A unique id.
     * @api public
     */
    function yeast() {
        const now = encode$1(+new Date());
        if (now !== prev)
            return seed = 0, prev = now;
        return now + '.' + encode$1(seed++);
    }
    //
    // Map each character to its index.
    //
    for (; i < length; i++)
        map[alphabet[i]] = i;

    // imported from https://github.com/galkn/querystring
    /**
     * Compiles a querystring
     * Returns string representation of the object
     *
     * @param {Object}
     * @api private
     */
    function encode(obj) {
        let str = '';
        for (let i in obj) {
            if (obj.hasOwnProperty(i)) {
                if (str.length)
                    str += '&';
                str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
            }
        }
        return str;
    }
    /**
     * Parses a simple querystring into an object
     *
     * @param {String} qs
     * @api private
     */
    function decode(qs) {
        let qry = {};
        let pairs = qs.split('&');
        for (let i = 0, l = pairs.length; i < l; i++) {
            let pair = pairs[i].split('=');
            qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return qry;
    }

    // imported from https://github.com/component/has-cors
    let value = false;
    try {
        value = typeof XMLHttpRequest !== 'undefined' &&
            'withCredentials' in new XMLHttpRequest();
    }
    catch (err) {
        // if XMLHttp support is disabled in IE then it will throw
        // when trying to create
    }
    const hasCORS = value;

    // browser shim for xmlhttprequest module
    function XHR(opts) {
        const xdomain = opts.xdomain;
        // XMLHttpRequest can be disabled on IE
        try {
            if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
                return new XMLHttpRequest();
            }
        }
        catch (e) { }
        if (!xdomain) {
            try {
                return new globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
            }
            catch (e) { }
        }
    }

    function empty() { }
    const hasXHR2 = (function () {
        const xhr = new XHR({
            xdomain: false,
        });
        return null != xhr.responseType;
    })();
    class Polling extends Transport {
        /**
         * XHR Polling constructor.
         *
         * @param {Object} opts
         * @package
         */
        constructor(opts) {
            super(opts);
            this.polling = false;
            if (typeof location !== "undefined") {
                const isSSL = "https:" === location.protocol;
                let port = location.port;
                // some user agents have empty `location.port`
                if (!port) {
                    port = isSSL ? "443" : "80";
                }
                this.xd =
                    (typeof location !== "undefined" &&
                        opts.hostname !== location.hostname) ||
                        port !== opts.port;
                this.xs = opts.secure !== isSSL;
            }
            /**
             * XHR supports binary
             */
            const forceBase64 = opts && opts.forceBase64;
            this.supportsBinary = hasXHR2 && !forceBase64;
        }
        get name() {
            return "polling";
        }
        /**
         * Opens the socket (triggers polling). We write a PING message to determine
         * when the transport is open.
         *
         * @protected
         */
        doOpen() {
            this.poll();
        }
        /**
         * Pauses polling.
         *
         * @param {Function} onPause - callback upon buffers are flushed and transport is paused
         * @package
         */
        pause(onPause) {
            this.readyState = "pausing";
            const pause = () => {
                this.readyState = "paused";
                onPause();
            };
            if (this.polling || !this.writable) {
                let total = 0;
                if (this.polling) {
                    total++;
                    this.once("pollComplete", function () {
                        --total || pause();
                    });
                }
                if (!this.writable) {
                    total++;
                    this.once("drain", function () {
                        --total || pause();
                    });
                }
            }
            else {
                pause();
            }
        }
        /**
         * Starts polling cycle.
         *
         * @private
         */
        poll() {
            this.polling = true;
            this.doPoll();
            this.emitReserved("poll");
        }
        /**
         * Overloads onData to detect payloads.
         *
         * @protected
         */
        onData(data) {
            const callback = (packet) => {
                // if its the first message we consider the transport open
                if ("opening" === this.readyState && packet.type === "open") {
                    this.onOpen();
                }
                // if its a close packet, we close the ongoing requests
                if ("close" === packet.type) {
                    this.onClose({ description: "transport closed by the server" });
                    return false;
                }
                // otherwise bypass onData and handle the message
                this.onPacket(packet);
            };
            // decode payload
            decodePayload(data, this.socket.binaryType).forEach(callback);
            // if an event did not trigger closing
            if ("closed" !== this.readyState) {
                // if we got data we're not polling
                this.polling = false;
                this.emitReserved("pollComplete");
                if ("open" === this.readyState) {
                    this.poll();
                }
            }
        }
        /**
         * For polling, send a close packet.
         *
         * @protected
         */
        doClose() {
            const close = () => {
                this.write([{ type: "close" }]);
            };
            if ("open" === this.readyState) {
                close();
            }
            else {
                // in case we're trying to close while
                // handshaking is in progress (GH-164)
                this.once("open", close);
            }
        }
        /**
         * Writes a packets payload.
         *
         * @param {Array} packets - data packets
         * @protected
         */
        write(packets) {
            this.writable = false;
            encodePayload(packets, (data) => {
                this.doWrite(data, () => {
                    this.writable = true;
                    this.emitReserved("drain");
                });
            });
        }
        /**
         * Generates uri for connection.
         *
         * @private
         */
        uri() {
            let query = this.query || {};
            const schema = this.opts.secure ? "https" : "http";
            let port = "";
            // cache busting is forced
            if (false !== this.opts.timestampRequests) {
                query[this.opts.timestampParam] = yeast();
            }
            if (!this.supportsBinary && !query.sid) {
                query.b64 = 1;
            }
            // avoid port if default for schema
            if (this.opts.port &&
                (("https" === schema && Number(this.opts.port) !== 443) ||
                    ("http" === schema && Number(this.opts.port) !== 80))) {
                port = ":" + this.opts.port;
            }
            const encodedQuery = encode(query);
            const ipv6 = this.opts.hostname.indexOf(":") !== -1;
            return (schema +
                "://" +
                (ipv6 ? "[" + this.opts.hostname + "]" : this.opts.hostname) +
                port +
                this.opts.path +
                (encodedQuery.length ? "?" + encodedQuery : ""));
        }
        /**
         * Creates a request.
         *
         * @param {String} method
         * @private
         */
        request(opts = {}) {
            Object.assign(opts, { xd: this.xd, xs: this.xs }, this.opts);
            return new Request(this.uri(), opts);
        }
        /**
         * Sends data.
         *
         * @param {String} data to send.
         * @param {Function} called upon flush.
         * @private
         */
        doWrite(data, fn) {
            const req = this.request({
                method: "POST",
                data: data,
            });
            req.on("success", fn);
            req.on("error", (xhrStatus, context) => {
                this.onError("xhr post error", xhrStatus, context);
            });
        }
        /**
         * Starts a poll cycle.
         *
         * @private
         */
        doPoll() {
            const req = this.request();
            req.on("data", this.onData.bind(this));
            req.on("error", (xhrStatus, context) => {
                this.onError("xhr poll error", xhrStatus, context);
            });
            this.pollXhr = req;
        }
    }
    class Request extends Emitter {
        /**
         * Request constructor
         *
         * @param {Object} options
         * @package
         */
        constructor(uri, opts) {
            super();
            installTimerFunctions(this, opts);
            this.opts = opts;
            this.method = opts.method || "GET";
            this.uri = uri;
            this.async = false !== opts.async;
            this.data = undefined !== opts.data ? opts.data : null;
            this.create();
        }
        /**
         * Creates the XHR object and sends the request.
         *
         * @private
         */
        create() {
            const opts = pick(this.opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
            opts.xdomain = !!this.opts.xd;
            opts.xscheme = !!this.opts.xs;
            const xhr = (this.xhr = new XHR(opts));
            try {
                xhr.open(this.method, this.uri, this.async);
                try {
                    if (this.opts.extraHeaders) {
                        xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
                        for (let i in this.opts.extraHeaders) {
                            if (this.opts.extraHeaders.hasOwnProperty(i)) {
                                xhr.setRequestHeader(i, this.opts.extraHeaders[i]);
                            }
                        }
                    }
                }
                catch (e) { }
                if ("POST" === this.method) {
                    try {
                        xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
                    }
                    catch (e) { }
                }
                try {
                    xhr.setRequestHeader("Accept", "*/*");
                }
                catch (e) { }
                // ie6 check
                if ("withCredentials" in xhr) {
                    xhr.withCredentials = this.opts.withCredentials;
                }
                if (this.opts.requestTimeout) {
                    xhr.timeout = this.opts.requestTimeout;
                }
                xhr.onreadystatechange = () => {
                    if (4 !== xhr.readyState)
                        return;
                    if (200 === xhr.status || 1223 === xhr.status) {
                        this.onLoad();
                    }
                    else {
                        // make sure the `error` event handler that's user-set
                        // does not throw in the same tick and gets caught here
                        this.setTimeoutFn(() => {
                            this.onError(typeof xhr.status === "number" ? xhr.status : 0);
                        }, 0);
                    }
                };
                xhr.send(this.data);
            }
            catch (e) {
                // Need to defer since .create() is called directly from the constructor
                // and thus the 'error' event can only be only bound *after* this exception
                // occurs.  Therefore, also, we cannot throw here at all.
                this.setTimeoutFn(() => {
                    this.onError(e);
                }, 0);
                return;
            }
            if (typeof document !== "undefined") {
                this.index = Request.requestsCount++;
                Request.requests[this.index] = this;
            }
        }
        /**
         * Called upon error.
         *
         * @private
         */
        onError(err) {
            this.emitReserved("error", err, this.xhr);
            this.cleanup(true);
        }
        /**
         * Cleans up house.
         *
         * @private
         */
        cleanup(fromError) {
            if ("undefined" === typeof this.xhr || null === this.xhr) {
                return;
            }
            this.xhr.onreadystatechange = empty;
            if (fromError) {
                try {
                    this.xhr.abort();
                }
                catch (e) { }
            }
            if (typeof document !== "undefined") {
                delete Request.requests[this.index];
            }
            this.xhr = null;
        }
        /**
         * Called upon load.
         *
         * @private
         */
        onLoad() {
            const data = this.xhr.responseText;
            if (data !== null) {
                this.emitReserved("data", data);
                this.emitReserved("success");
                this.cleanup();
            }
        }
        /**
         * Aborts the request.
         *
         * @package
         */
        abort() {
            this.cleanup();
        }
    }
    Request.requestsCount = 0;
    Request.requests = {};
    /**
     * Aborts pending requests when unloading the window. This is needed to prevent
     * memory leaks (e.g. when using IE) and to ensure that no spurious error is
     * emitted.
     */
    if (typeof document !== "undefined") {
        // @ts-ignore
        if (typeof attachEvent === "function") {
            // @ts-ignore
            attachEvent("onunload", unloadHandler);
        }
        else if (typeof addEventListener === "function") {
            const terminationEvent = "onpagehide" in globalThisShim ? "pagehide" : "unload";
            addEventListener(terminationEvent, unloadHandler, false);
        }
    }
    function unloadHandler() {
        for (let i in Request.requests) {
            if (Request.requests.hasOwnProperty(i)) {
                Request.requests[i].abort();
            }
        }
    }

    const nextTick = (() => {
        const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
        if (isPromiseAvailable) {
            return (cb) => Promise.resolve().then(cb);
        }
        else {
            return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
        }
    })();
    const WebSocket = globalThisShim.WebSocket || globalThisShim.MozWebSocket;
    const usingBrowserWebSocket = true;
    const defaultBinaryType = "arraybuffer";

    // detect ReactNative environment
    const isReactNative = typeof navigator !== "undefined" &&
        typeof navigator.product === "string" &&
        navigator.product.toLowerCase() === "reactnative";
    class WS extends Transport {
        /**
         * WebSocket transport constructor.
         *
         * @param {Object} opts - connection options
         * @protected
         */
        constructor(opts) {
            super(opts);
            this.supportsBinary = !opts.forceBase64;
        }
        get name() {
            return "websocket";
        }
        doOpen() {
            if (!this.check()) {
                // let probe timeout
                return;
            }
            const uri = this.uri();
            const protocols = this.opts.protocols;
            // React Native only supports the 'headers' option, and will print a warning if anything else is passed
            const opts = isReactNative
                ? {}
                : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
            if (this.opts.extraHeaders) {
                opts.headers = this.opts.extraHeaders;
            }
            try {
                this.ws =
                    usingBrowserWebSocket && !isReactNative
                        ? protocols
                            ? new WebSocket(uri, protocols)
                            : new WebSocket(uri)
                        : new WebSocket(uri, protocols, opts);
            }
            catch (err) {
                return this.emitReserved("error", err);
            }
            this.ws.binaryType = this.socket.binaryType || defaultBinaryType;
            this.addEventListeners();
        }
        /**
         * Adds event listeners to the socket
         *
         * @private
         */
        addEventListeners() {
            this.ws.onopen = () => {
                if (this.opts.autoUnref) {
                    this.ws._socket.unref();
                }
                this.onOpen();
            };
            this.ws.onclose = (closeEvent) => this.onClose({
                description: "websocket connection closed",
                context: closeEvent,
            });
            this.ws.onmessage = (ev) => this.onData(ev.data);
            this.ws.onerror = (e) => this.onError("websocket error", e);
        }
        write(packets) {
            this.writable = false;
            // encodePacket efficient as it uses WS framing
            // no need for encodePayload
            for (let i = 0; i < packets.length; i++) {
                const packet = packets[i];
                const lastPacket = i === packets.length - 1;
                encodePacket(packet, this.supportsBinary, (data) => {
                    // always create a new object (GH-437)
                    const opts = {};
                    // Sometimes the websocket has already been closed but the browser didn't
                    // have a chance of informing us about it yet, in that case send will
                    // throw an error
                    try {
                        if (usingBrowserWebSocket) {
                            // TypeError is thrown when passing the second argument on Safari
                            this.ws.send(data);
                        }
                    }
                    catch (e) {
                    }
                    if (lastPacket) {
                        // fake drain
                        // defer to next tick to allow Socket to clear writeBuffer
                        nextTick(() => {
                            this.writable = true;
                            this.emitReserved("drain");
                        }, this.setTimeoutFn);
                    }
                });
            }
        }
        doClose() {
            if (typeof this.ws !== "undefined") {
                this.ws.close();
                this.ws = null;
            }
        }
        /**
         * Generates uri for connection.
         *
         * @private
         */
        uri() {
            let query = this.query || {};
            const schema = this.opts.secure ? "wss" : "ws";
            let port = "";
            // avoid port if default for schema
            if (this.opts.port &&
                (("wss" === schema && Number(this.opts.port) !== 443) ||
                    ("ws" === schema && Number(this.opts.port) !== 80))) {
                port = ":" + this.opts.port;
            }
            // append timestamp to URI
            if (this.opts.timestampRequests) {
                query[this.opts.timestampParam] = yeast();
            }
            // communicate binary support capabilities
            if (!this.supportsBinary) {
                query.b64 = 1;
            }
            const encodedQuery = encode(query);
            const ipv6 = this.opts.hostname.indexOf(":") !== -1;
            return (schema +
                "://" +
                (ipv6 ? "[" + this.opts.hostname + "]" : this.opts.hostname) +
                port +
                this.opts.path +
                (encodedQuery.length ? "?" + encodedQuery : ""));
        }
        /**
         * Feature detection for WebSocket.
         *
         * @return {Boolean} whether this transport is available.
         * @private
         */
        check() {
            return !!WebSocket;
        }
    }

    const transports = {
        websocket: WS,
        polling: Polling,
    };

    // imported from https://github.com/galkn/parseuri
    /**
     * Parses a URI
     *
     * Note: we could also have used the built-in URL object, but it isn't supported on all platforms.
     *
     * See:
     * - https://developer.mozilla.org/en-US/docs/Web/API/URL
     * - https://caniuse.com/url
     * - https://www.rfc-editor.org/rfc/rfc3986#appendix-B
     *
     * History of the parse() method:
     * - first commit: https://github.com/socketio/socket.io-client/commit/4ee1d5d94b3906a9c052b459f1a818b15f38f91c
     * - export into its own module: https://github.com/socketio/engine.io-client/commit/de2c561e4564efeb78f1bdb1ba39ef81b2822cb3
     * - reimport: https://github.com/socketio/engine.io-client/commit/df32277c3f6d622eec5ed09f493cae3f3391d242
     *
     * @author Steven Levithan <stevenlevithan.com> (MIT license)
     * @api private
     */
    const re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
    const parts = [
        'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
    ];
    function parse(str) {
        const src = str, b = str.indexOf('['), e = str.indexOf(']');
        if (b != -1 && e != -1) {
            str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
        }
        let m = re.exec(str || ''), uri = {}, i = 14;
        while (i--) {
            uri[parts[i]] = m[i] || '';
        }
        if (b != -1 && e != -1) {
            uri.source = src;
            uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
            uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
            uri.ipv6uri = true;
        }
        uri.pathNames = pathNames(uri, uri['path']);
        uri.queryKey = queryKey(uri, uri['query']);
        return uri;
    }
    function pathNames(obj, path) {
        const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
        if (path.slice(0, 1) == '/' || path.length === 0) {
            names.splice(0, 1);
        }
        if (path.slice(-1) == '/') {
            names.splice(names.length - 1, 1);
        }
        return names;
    }
    function queryKey(uri, query) {
        const data = {};
        query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function ($0, $1, $2) {
            if ($1) {
                data[$1] = $2;
            }
        });
        return data;
    }

    let Socket$1 = class Socket extends Emitter {
        /**
         * Socket constructor.
         *
         * @param {String|Object} uri - uri or options
         * @param {Object} opts - options
         */
        constructor(uri, opts = {}) {
            super();
            this.writeBuffer = [];
            if (uri && "object" === typeof uri) {
                opts = uri;
                uri = null;
            }
            if (uri) {
                uri = parse(uri);
                opts.hostname = uri.host;
                opts.secure = uri.protocol === "https" || uri.protocol === "wss";
                opts.port = uri.port;
                if (uri.query)
                    opts.query = uri.query;
            }
            else if (opts.host) {
                opts.hostname = parse(opts.host).host;
            }
            installTimerFunctions(this, opts);
            this.secure =
                null != opts.secure
                    ? opts.secure
                    : typeof location !== "undefined" && "https:" === location.protocol;
            if (opts.hostname && !opts.port) {
                // if no port is specified manually, use the protocol default
                opts.port = this.secure ? "443" : "80";
            }
            this.hostname =
                opts.hostname ||
                    (typeof location !== "undefined" ? location.hostname : "localhost");
            this.port =
                opts.port ||
                    (typeof location !== "undefined" && location.port
                        ? location.port
                        : this.secure
                            ? "443"
                            : "80");
            this.transports = opts.transports || ["polling", "websocket"];
            this.writeBuffer = [];
            this.prevBufferLen = 0;
            this.opts = Object.assign({
                path: "/engine.io",
                agent: false,
                withCredentials: false,
                upgrade: true,
                timestampParam: "t",
                rememberUpgrade: false,
                addTrailingSlash: true,
                rejectUnauthorized: true,
                perMessageDeflate: {
                    threshold: 1024,
                },
                transportOptions: {},
                closeOnBeforeunload: true,
            }, opts);
            this.opts.path =
                this.opts.path.replace(/\/$/, "") +
                    (this.opts.addTrailingSlash ? "/" : "");
            if (typeof this.opts.query === "string") {
                this.opts.query = decode(this.opts.query);
            }
            // set on handshake
            this.id = null;
            this.upgrades = null;
            this.pingInterval = null;
            this.pingTimeout = null;
            // set on heartbeat
            this.pingTimeoutTimer = null;
            if (typeof addEventListener === "function") {
                if (this.opts.closeOnBeforeunload) {
                    // Firefox closes the connection when the "beforeunload" event is emitted but not Chrome. This event listener
                    // ensures every browser behaves the same (no "disconnect" event at the Socket.IO level when the page is
                    // closed/reloaded)
                    this.beforeunloadEventListener = () => {
                        if (this.transport) {
                            // silently close the transport
                            this.transport.removeAllListeners();
                            this.transport.close();
                        }
                    };
                    addEventListener("beforeunload", this.beforeunloadEventListener, false);
                }
                if (this.hostname !== "localhost") {
                    this.offlineEventListener = () => {
                        this.onClose("transport close", {
                            description: "network connection lost",
                        });
                    };
                    addEventListener("offline", this.offlineEventListener, false);
                }
            }
            this.open();
        }
        /**
         * Creates transport of the given type.
         *
         * @param {String} name - transport name
         * @return {Transport}
         * @private
         */
        createTransport(name) {
            const query = Object.assign({}, this.opts.query);
            // append engine.io protocol identifier
            query.EIO = protocol$1;
            // transport name
            query.transport = name;
            // session id if we already have one
            if (this.id)
                query.sid = this.id;
            const opts = Object.assign({}, this.opts.transportOptions[name], this.opts, {
                query,
                socket: this,
                hostname: this.hostname,
                secure: this.secure,
                port: this.port,
            });
            return new transports[name](opts);
        }
        /**
         * Initializes transport to use and starts probe.
         *
         * @private
         */
        open() {
            let transport;
            if (this.opts.rememberUpgrade &&
                Socket.priorWebsocketSuccess &&
                this.transports.indexOf("websocket") !== -1) {
                transport = "websocket";
            }
            else if (0 === this.transports.length) {
                // Emit error on next tick so it can be listened to
                this.setTimeoutFn(() => {
                    this.emitReserved("error", "No transports available");
                }, 0);
                return;
            }
            else {
                transport = this.transports[0];
            }
            this.readyState = "opening";
            // Retry with the next transport if the transport is disabled (jsonp: false)
            try {
                transport = this.createTransport(transport);
            }
            catch (e) {
                this.transports.shift();
                this.open();
                return;
            }
            transport.open();
            this.setTransport(transport);
        }
        /**
         * Sets the current transport. Disables the existing one (if any).
         *
         * @private
         */
        setTransport(transport) {
            if (this.transport) {
                this.transport.removeAllListeners();
            }
            // set up transport
            this.transport = transport;
            // set up transport listeners
            transport
                .on("drain", this.onDrain.bind(this))
                .on("packet", this.onPacket.bind(this))
                .on("error", this.onError.bind(this))
                .on("close", (reason) => this.onClose("transport close", reason));
        }
        /**
         * Probes a transport.
         *
         * @param {String} name - transport name
         * @private
         */
        probe(name) {
            let transport = this.createTransport(name);
            let failed = false;
            Socket.priorWebsocketSuccess = false;
            const onTransportOpen = () => {
                if (failed)
                    return;
                transport.send([{ type: "ping", data: "probe" }]);
                transport.once("packet", (msg) => {
                    if (failed)
                        return;
                    if ("pong" === msg.type && "probe" === msg.data) {
                        this.upgrading = true;
                        this.emitReserved("upgrading", transport);
                        if (!transport)
                            return;
                        Socket.priorWebsocketSuccess = "websocket" === transport.name;
                        this.transport.pause(() => {
                            if (failed)
                                return;
                            if ("closed" === this.readyState)
                                return;
                            cleanup();
                            this.setTransport(transport);
                            transport.send([{ type: "upgrade" }]);
                            this.emitReserved("upgrade", transport);
                            transport = null;
                            this.upgrading = false;
                            this.flush();
                        });
                    }
                    else {
                        const err = new Error("probe error");
                        // @ts-ignore
                        err.transport = transport.name;
                        this.emitReserved("upgradeError", err);
                    }
                });
            };
            function freezeTransport() {
                if (failed)
                    return;
                // Any callback called by transport should be ignored since now
                failed = true;
                cleanup();
                transport.close();
                transport = null;
            }
            // Handle any error that happens while probing
            const onerror = (err) => {
                const error = new Error("probe error: " + err);
                // @ts-ignore
                error.transport = transport.name;
                freezeTransport();
                this.emitReserved("upgradeError", error);
            };
            function onTransportClose() {
                onerror("transport closed");
            }
            // When the socket is closed while we're probing
            function onclose() {
                onerror("socket closed");
            }
            // When the socket is upgraded while we're probing
            function onupgrade(to) {
                if (transport && to.name !== transport.name) {
                    freezeTransport();
                }
            }
            // Remove all listeners on the transport and on self
            const cleanup = () => {
                transport.removeListener("open", onTransportOpen);
                transport.removeListener("error", onerror);
                transport.removeListener("close", onTransportClose);
                this.off("close", onclose);
                this.off("upgrading", onupgrade);
            };
            transport.once("open", onTransportOpen);
            transport.once("error", onerror);
            transport.once("close", onTransportClose);
            this.once("close", onclose);
            this.once("upgrading", onupgrade);
            transport.open();
        }
        /**
         * Called when connection is deemed open.
         *
         * @private
         */
        onOpen() {
            this.readyState = "open";
            Socket.priorWebsocketSuccess = "websocket" === this.transport.name;
            this.emitReserved("open");
            this.flush();
            // we check for `readyState` in case an `open`
            // listener already closed the socket
            if ("open" === this.readyState && this.opts.upgrade) {
                let i = 0;
                const l = this.upgrades.length;
                for (; i < l; i++) {
                    this.probe(this.upgrades[i]);
                }
            }
        }
        /**
         * Handles a packet.
         *
         * @private
         */
        onPacket(packet) {
            if ("opening" === this.readyState ||
                "open" === this.readyState ||
                "closing" === this.readyState) {
                this.emitReserved("packet", packet);
                // Socket is live - any packet counts
                this.emitReserved("heartbeat");
                switch (packet.type) {
                    case "open":
                        this.onHandshake(JSON.parse(packet.data));
                        break;
                    case "ping":
                        this.resetPingTimeout();
                        this.sendPacket("pong");
                        this.emitReserved("ping");
                        this.emitReserved("pong");
                        break;
                    case "error":
                        const err = new Error("server error");
                        // @ts-ignore
                        err.code = packet.data;
                        this.onError(err);
                        break;
                    case "message":
                        this.emitReserved("data", packet.data);
                        this.emitReserved("message", packet.data);
                        break;
                }
            }
        }
        /**
         * Called upon handshake completion.
         *
         * @param {Object} data - handshake obj
         * @private
         */
        onHandshake(data) {
            this.emitReserved("handshake", data);
            this.id = data.sid;
            this.transport.query.sid = data.sid;
            this.upgrades = this.filterUpgrades(data.upgrades);
            this.pingInterval = data.pingInterval;
            this.pingTimeout = data.pingTimeout;
            this.maxPayload = data.maxPayload;
            this.onOpen();
            // In case open handler closes socket
            if ("closed" === this.readyState)
                return;
            this.resetPingTimeout();
        }
        /**
         * Sets and resets ping timeout timer based on server pings.
         *
         * @private
         */
        resetPingTimeout() {
            this.clearTimeoutFn(this.pingTimeoutTimer);
            this.pingTimeoutTimer = this.setTimeoutFn(() => {
                this.onClose("ping timeout");
            }, this.pingInterval + this.pingTimeout);
            if (this.opts.autoUnref) {
                this.pingTimeoutTimer.unref();
            }
        }
        /**
         * Called on `drain` event
         *
         * @private
         */
        onDrain() {
            this.writeBuffer.splice(0, this.prevBufferLen);
            // setting prevBufferLen = 0 is very important
            // for example, when upgrading, upgrade packet is sent over,
            // and a nonzero prevBufferLen could cause problems on `drain`
            this.prevBufferLen = 0;
            if (0 === this.writeBuffer.length) {
                this.emitReserved("drain");
            }
            else {
                this.flush();
            }
        }
        /**
         * Flush write buffers.
         *
         * @private
         */
        flush() {
            if ("closed" !== this.readyState &&
                this.transport.writable &&
                !this.upgrading &&
                this.writeBuffer.length) {
                const packets = this.getWritablePackets();
                this.transport.send(packets);
                // keep track of current length of writeBuffer
                // splice writeBuffer and callbackBuffer on `drain`
                this.prevBufferLen = packets.length;
                this.emitReserved("flush");
            }
        }
        /**
         * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
         * long-polling)
         *
         * @private
         */
        getWritablePackets() {
            const shouldCheckPayloadSize = this.maxPayload &&
                this.transport.name === "polling" &&
                this.writeBuffer.length > 1;
            if (!shouldCheckPayloadSize) {
                return this.writeBuffer;
            }
            let payloadSize = 1; // first packet type
            for (let i = 0; i < this.writeBuffer.length; i++) {
                const data = this.writeBuffer[i].data;
                if (data) {
                    payloadSize += byteLength(data);
                }
                if (i > 0 && payloadSize > this.maxPayload) {
                    return this.writeBuffer.slice(0, i);
                }
                payloadSize += 2; // separator + packet type
            }
            return this.writeBuffer;
        }
        /**
         * Sends a message.
         *
         * @param {String} msg - message.
         * @param {Object} options.
         * @param {Function} callback function.
         * @return {Socket} for chaining.
         */
        write(msg, options, fn) {
            this.sendPacket("message", msg, options, fn);
            return this;
        }
        send(msg, options, fn) {
            this.sendPacket("message", msg, options, fn);
            return this;
        }
        /**
         * Sends a packet.
         *
         * @param {String} type: packet type.
         * @param {String} data.
         * @param {Object} options.
         * @param {Function} fn - callback function.
         * @private
         */
        sendPacket(type, data, options, fn) {
            if ("function" === typeof data) {
                fn = data;
                data = undefined;
            }
            if ("function" === typeof options) {
                fn = options;
                options = null;
            }
            if ("closing" === this.readyState || "closed" === this.readyState) {
                return;
            }
            options = options || {};
            options.compress = false !== options.compress;
            const packet = {
                type: type,
                data: data,
                options: options,
            };
            this.emitReserved("packetCreate", packet);
            this.writeBuffer.push(packet);
            if (fn)
                this.once("flush", fn);
            this.flush();
        }
        /**
         * Closes the connection.
         */
        close() {
            const close = () => {
                this.onClose("forced close");
                this.transport.close();
            };
            const cleanupAndClose = () => {
                this.off("upgrade", cleanupAndClose);
                this.off("upgradeError", cleanupAndClose);
                close();
            };
            const waitForUpgrade = () => {
                // wait for upgrade to finish since we can't send packets while pausing a transport
                this.once("upgrade", cleanupAndClose);
                this.once("upgradeError", cleanupAndClose);
            };
            if ("opening" === this.readyState || "open" === this.readyState) {
                this.readyState = "closing";
                if (this.writeBuffer.length) {
                    this.once("drain", () => {
                        if (this.upgrading) {
                            waitForUpgrade();
                        }
                        else {
                            close();
                        }
                    });
                }
                else if (this.upgrading) {
                    waitForUpgrade();
                }
                else {
                    close();
                }
            }
            return this;
        }
        /**
         * Called upon transport error
         *
         * @private
         */
        onError(err) {
            Socket.priorWebsocketSuccess = false;
            this.emitReserved("error", err);
            this.onClose("transport error", err);
        }
        /**
         * Called upon transport close.
         *
         * @private
         */
        onClose(reason, description) {
            if ("opening" === this.readyState ||
                "open" === this.readyState ||
                "closing" === this.readyState) {
                // clear timers
                this.clearTimeoutFn(this.pingTimeoutTimer);
                // stop event from firing again for transport
                this.transport.removeAllListeners("close");
                // ensure transport won't stay open
                this.transport.close();
                // ignore further transport communication
                this.transport.removeAllListeners();
                if (typeof removeEventListener === "function") {
                    removeEventListener("beforeunload", this.beforeunloadEventListener, false);
                    removeEventListener("offline", this.offlineEventListener, false);
                }
                // set ready state
                this.readyState = "closed";
                // clear session id
                this.id = null;
                // emit close event
                this.emitReserved("close", reason, description);
                // clean buffers after, so users can still
                // grab the buffers on `close` event
                this.writeBuffer = [];
                this.prevBufferLen = 0;
            }
        }
        /**
         * Filters upgrades, returning only those matching client transports.
         *
         * @param {Array} upgrades - server upgrades
         * @private
         */
        filterUpgrades(upgrades) {
            const filteredUpgrades = [];
            let i = 0;
            const j = upgrades.length;
            for (; i < j; i++) {
                if (~this.transports.indexOf(upgrades[i]))
                    filteredUpgrades.push(upgrades[i]);
            }
            return filteredUpgrades;
        }
    };
    Socket$1.protocol = protocol$1;

    /**
     * URL parser.
     *
     * @param uri - url
     * @param path - the request path of the connection
     * @param loc - An object meant to mimic window.location.
     *        Defaults to window.location.
     * @public
     */
    function url(uri, path = "", loc) {
        let obj = uri;
        // default to window.location
        loc = loc || (typeof location !== "undefined" && location);
        if (null == uri)
            uri = loc.protocol + "//" + loc.host;
        // relative path support
        if (typeof uri === "string") {
            if ("/" === uri.charAt(0)) {
                if ("/" === uri.charAt(1)) {
                    uri = loc.protocol + uri;
                }
                else {
                    uri = loc.host + uri;
                }
            }
            if (!/^(https?|wss?):\/\//.test(uri)) {
                if ("undefined" !== typeof loc) {
                    uri = loc.protocol + "//" + uri;
                }
                else {
                    uri = "https://" + uri;
                }
            }
            // parse
            obj = parse(uri);
        }
        // make sure we treat `localhost:80` and `localhost` equally
        if (!obj.port) {
            if (/^(http|ws)$/.test(obj.protocol)) {
                obj.port = "80";
            }
            else if (/^(http|ws)s$/.test(obj.protocol)) {
                obj.port = "443";
            }
        }
        obj.path = obj.path || "/";
        const ipv6 = obj.host.indexOf(":") !== -1;
        const host = ipv6 ? "[" + obj.host + "]" : obj.host;
        // define unique id
        obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
        // define href
        obj.href =
            obj.protocol +
                "://" +
                host +
                (loc && loc.port === obj.port ? "" : ":" + obj.port);
        return obj;
    }

    const withNativeArrayBuffer = typeof ArrayBuffer === "function";
    const isView = (obj) => {
        return typeof ArrayBuffer.isView === "function"
            ? ArrayBuffer.isView(obj)
            : obj.buffer instanceof ArrayBuffer;
    };
    const toString = Object.prototype.toString;
    const withNativeBlob = typeof Blob === "function" ||
        (typeof Blob !== "undefined" &&
            toString.call(Blob) === "[object BlobConstructor]");
    const withNativeFile = typeof File === "function" ||
        (typeof File !== "undefined" &&
            toString.call(File) === "[object FileConstructor]");
    /**
     * Returns true if obj is a Buffer, an ArrayBuffer, a Blob or a File.
     *
     * @private
     */
    function isBinary(obj) {
        return ((withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj))) ||
            (withNativeBlob && obj instanceof Blob) ||
            (withNativeFile && obj instanceof File));
    }
    function hasBinary(obj, toJSON) {
        if (!obj || typeof obj !== "object") {
            return false;
        }
        if (Array.isArray(obj)) {
            for (let i = 0, l = obj.length; i < l; i++) {
                if (hasBinary(obj[i])) {
                    return true;
                }
            }
            return false;
        }
        if (isBinary(obj)) {
            return true;
        }
        if (obj.toJSON &&
            typeof obj.toJSON === "function" &&
            arguments.length === 1) {
            return hasBinary(obj.toJSON(), true);
        }
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Replaces every Buffer | ArrayBuffer | Blob | File in packet with a numbered placeholder.
     *
     * @param {Object} packet - socket.io event packet
     * @return {Object} with deconstructed packet and list of buffers
     * @public
     */
    function deconstructPacket(packet) {
        const buffers = [];
        const packetData = packet.data;
        const pack = packet;
        pack.data = _deconstructPacket(packetData, buffers);
        pack.attachments = buffers.length; // number of binary 'attachments'
        return { packet: pack, buffers: buffers };
    }
    function _deconstructPacket(data, buffers) {
        if (!data)
            return data;
        if (isBinary(data)) {
            const placeholder = { _placeholder: true, num: buffers.length };
            buffers.push(data);
            return placeholder;
        }
        else if (Array.isArray(data)) {
            const newData = new Array(data.length);
            for (let i = 0; i < data.length; i++) {
                newData[i] = _deconstructPacket(data[i], buffers);
            }
            return newData;
        }
        else if (typeof data === "object" && !(data instanceof Date)) {
            const newData = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    newData[key] = _deconstructPacket(data[key], buffers);
                }
            }
            return newData;
        }
        return data;
    }
    /**
     * Reconstructs a binary packet from its placeholder packet and buffers
     *
     * @param {Object} packet - event packet with placeholders
     * @param {Array} buffers - binary buffers to put in placeholder positions
     * @return {Object} reconstructed packet
     * @public
     */
    function reconstructPacket(packet, buffers) {
        packet.data = _reconstructPacket(packet.data, buffers);
        delete packet.attachments; // no longer useful
        return packet;
    }
    function _reconstructPacket(data, buffers) {
        if (!data)
            return data;
        if (data && data._placeholder === true) {
            const isIndexValid = typeof data.num === "number" &&
                data.num >= 0 &&
                data.num < buffers.length;
            if (isIndexValid) {
                return buffers[data.num]; // appropriate buffer (should be natural order anyway)
            }
            else {
                throw new Error("illegal attachments");
            }
        }
        else if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                data[i] = _reconstructPacket(data[i], buffers);
            }
        }
        else if (typeof data === "object") {
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    data[key] = _reconstructPacket(data[key], buffers);
                }
            }
        }
        return data;
    }

    /**
     * These strings must not be used as event names, as they have a special meaning.
     */
    const RESERVED_EVENTS$1 = [
        "connect",
        "connect_error",
        "disconnect",
        "disconnecting",
        "newListener",
        "removeListener", // used by the Node.js EventEmitter
    ];
    /**
     * Protocol version.
     *
     * @public
     */
    const protocol = 5;
    var PacketType;
    (function (PacketType) {
        PacketType[PacketType["CONNECT"] = 0] = "CONNECT";
        PacketType[PacketType["DISCONNECT"] = 1] = "DISCONNECT";
        PacketType[PacketType["EVENT"] = 2] = "EVENT";
        PacketType[PacketType["ACK"] = 3] = "ACK";
        PacketType[PacketType["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
        PacketType[PacketType["BINARY_EVENT"] = 5] = "BINARY_EVENT";
        PacketType[PacketType["BINARY_ACK"] = 6] = "BINARY_ACK";
    })(PacketType || (PacketType = {}));
    /**
     * A socket.io Encoder instance
     */
    class Encoder {
        /**
         * Encoder constructor
         *
         * @param {function} replacer - custom replacer to pass down to JSON.parse
         */
        constructor(replacer) {
            this.replacer = replacer;
        }
        /**
         * Encode a packet as a single string if non-binary, or as a
         * buffer sequence, depending on packet type.
         *
         * @param {Object} obj - packet object
         */
        encode(obj) {
            if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
                if (hasBinary(obj)) {
                    return this.encodeAsBinary({
                        type: obj.type === PacketType.EVENT
                            ? PacketType.BINARY_EVENT
                            : PacketType.BINARY_ACK,
                        nsp: obj.nsp,
                        data: obj.data,
                        id: obj.id,
                    });
                }
            }
            return [this.encodeAsString(obj)];
        }
        /**
         * Encode packet as string.
         */
        encodeAsString(obj) {
            // first is type
            let str = "" + obj.type;
            // attachments if we have them
            if (obj.type === PacketType.BINARY_EVENT ||
                obj.type === PacketType.BINARY_ACK) {
                str += obj.attachments + "-";
            }
            // if we have a namespace other than `/`
            // we append it followed by a comma `,`
            if (obj.nsp && "/" !== obj.nsp) {
                str += obj.nsp + ",";
            }
            // immediately followed by the id
            if (null != obj.id) {
                str += obj.id;
            }
            // json data
            if (null != obj.data) {
                str += JSON.stringify(obj.data, this.replacer);
            }
            return str;
        }
        /**
         * Encode packet as 'buffer sequence' by removing blobs, and
         * deconstructing packet into object with placeholders and
         * a list of buffers.
         */
        encodeAsBinary(obj) {
            const deconstruction = deconstructPacket(obj);
            const pack = this.encodeAsString(deconstruction.packet);
            const buffers = deconstruction.buffers;
            buffers.unshift(pack); // add packet info to beginning of data list
            return buffers; // write all the buffers
        }
    }
    // see https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
    function isObject(value) {
        return Object.prototype.toString.call(value) === "[object Object]";
    }
    /**
     * A socket.io Decoder instance
     *
     * @return {Object} decoder
     */
    class Decoder extends Emitter {
        /**
         * Decoder constructor
         *
         * @param {function} reviver - custom reviver to pass down to JSON.stringify
         */
        constructor(reviver) {
            super();
            this.reviver = reviver;
        }
        /**
         * Decodes an encoded packet string into packet JSON.
         *
         * @param {String} obj - encoded packet
         */
        add(obj) {
            let packet;
            if (typeof obj === "string") {
                if (this.reconstructor) {
                    throw new Error("got plaintext data when reconstructing a packet");
                }
                packet = this.decodeString(obj);
                const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
                if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
                    packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
                    // binary packet's json
                    this.reconstructor = new BinaryReconstructor(packet);
                    // no attachments, labeled binary but no binary data to follow
                    if (packet.attachments === 0) {
                        super.emitReserved("decoded", packet);
                    }
                }
                else {
                    // non-binary full packet
                    super.emitReserved("decoded", packet);
                }
            }
            else if (isBinary(obj) || obj.base64) {
                // raw binary data
                if (!this.reconstructor) {
                    throw new Error("got binary data when not reconstructing a packet");
                }
                else {
                    packet = this.reconstructor.takeBinaryData(obj);
                    if (packet) {
                        // received final buffer
                        this.reconstructor = null;
                        super.emitReserved("decoded", packet);
                    }
                }
            }
            else {
                throw new Error("Unknown type: " + obj);
            }
        }
        /**
         * Decode a packet String (JSON data)
         *
         * @param {String} str
         * @return {Object} packet
         */
        decodeString(str) {
            let i = 0;
            // look up type
            const p = {
                type: Number(str.charAt(0)),
            };
            if (PacketType[p.type] === undefined) {
                throw new Error("unknown packet type " + p.type);
            }
            // look up attachments if type binary
            if (p.type === PacketType.BINARY_EVENT ||
                p.type === PacketType.BINARY_ACK) {
                const start = i + 1;
                while (str.charAt(++i) !== "-" && i != str.length) { }
                const buf = str.substring(start, i);
                if (buf != Number(buf) || str.charAt(i) !== "-") {
                    throw new Error("Illegal attachments");
                }
                p.attachments = Number(buf);
            }
            // look up namespace (if any)
            if ("/" === str.charAt(i + 1)) {
                const start = i + 1;
                while (++i) {
                    const c = str.charAt(i);
                    if ("," === c)
                        break;
                    if (i === str.length)
                        break;
                }
                p.nsp = str.substring(start, i);
            }
            else {
                p.nsp = "/";
            }
            // look up id
            const next = str.charAt(i + 1);
            if ("" !== next && Number(next) == next) {
                const start = i + 1;
                while (++i) {
                    const c = str.charAt(i);
                    if (null == c || Number(c) != c) {
                        --i;
                        break;
                    }
                    if (i === str.length)
                        break;
                }
                p.id = Number(str.substring(start, i + 1));
            }
            // look up json data
            if (str.charAt(++i)) {
                const payload = this.tryParse(str.substr(i));
                if (Decoder.isPayloadValid(p.type, payload)) {
                    p.data = payload;
                }
                else {
                    throw new Error("invalid payload");
                }
            }
            return p;
        }
        tryParse(str) {
            try {
                return JSON.parse(str, this.reviver);
            }
            catch (e) {
                return false;
            }
        }
        static isPayloadValid(type, payload) {
            switch (type) {
                case PacketType.CONNECT:
                    return isObject(payload);
                case PacketType.DISCONNECT:
                    return payload === undefined;
                case PacketType.CONNECT_ERROR:
                    return typeof payload === "string" || isObject(payload);
                case PacketType.EVENT:
                case PacketType.BINARY_EVENT:
                    return (Array.isArray(payload) &&
                        (typeof payload[0] === "number" ||
                            (typeof payload[0] === "string" &&
                                RESERVED_EVENTS$1.indexOf(payload[0]) === -1)));
                case PacketType.ACK:
                case PacketType.BINARY_ACK:
                    return Array.isArray(payload);
            }
        }
        /**
         * Deallocates a parser's resources
         */
        destroy() {
            if (this.reconstructor) {
                this.reconstructor.finishedReconstruction();
                this.reconstructor = null;
            }
        }
    }
    /**
     * A manager of a binary event's 'buffer sequence'. Should
     * be constructed whenever a packet of type BINARY_EVENT is
     * decoded.
     *
     * @param {Object} packet
     * @return {BinaryReconstructor} initialized reconstructor
     */
    class BinaryReconstructor {
        constructor(packet) {
            this.packet = packet;
            this.buffers = [];
            this.reconPack = packet;
        }
        /**
         * Method to be called when binary data received from connection
         * after a BINARY_EVENT packet.
         *
         * @param {Buffer | ArrayBuffer} binData - the raw binary data received
         * @return {null | Object} returns null if more binary data is expected or
         *   a reconstructed packet object if all buffers have been received.
         */
        takeBinaryData(binData) {
            this.buffers.push(binData);
            if (this.buffers.length === this.reconPack.attachments) {
                // done with buffer list
                const packet = reconstructPacket(this.reconPack, this.buffers);
                this.finishedReconstruction();
                return packet;
            }
            return null;
        }
        /**
         * Cleans up binary packet reconstruction variables.
         */
        finishedReconstruction() {
            this.reconPack = null;
            this.buffers = [];
        }
    }

    var parser = /*#__PURE__*/Object.freeze({
        __proto__: null,
        Decoder: Decoder,
        Encoder: Encoder,
        get PacketType () { return PacketType; },
        protocol: protocol
    });

    function on(obj, ev, fn) {
        obj.on(ev, fn);
        return function subDestroy() {
            obj.off(ev, fn);
        };
    }

    /**
     * Internal events.
     * These events can't be emitted by the user.
     */
    const RESERVED_EVENTS = Object.freeze({
        connect: 1,
        connect_error: 1,
        disconnect: 1,
        disconnecting: 1,
        // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
        newListener: 1,
        removeListener: 1,
    });
    /**
     * A Socket is the fundamental class for interacting with the server.
     *
     * A Socket belongs to a certain Namespace (by default /) and uses an underlying {@link Manager} to communicate.
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log("connected");
     * });
     *
     * // send an event to the server
     * socket.emit("foo", "bar");
     *
     * socket.on("foobar", () => {
     *   // an event was received from the server
     * });
     *
     * // upon disconnection
     * socket.on("disconnect", (reason) => {
     *   console.log(`disconnected due to ${reason}`);
     * });
     */
    class Socket extends Emitter {
        /**
         * `Socket` constructor.
         */
        constructor(io, nsp, opts) {
            super();
            /**
             * Whether the socket is currently connected to the server.
             *
             * @example
             * const socket = io();
             *
             * socket.on("connect", () => {
             *   console.log(socket.connected); // true
             * });
             *
             * socket.on("disconnect", () => {
             *   console.log(socket.connected); // false
             * });
             */
            this.connected = false;
            /**
             * Whether the connection state was recovered after a temporary disconnection. In that case, any missed packets will
             * be transmitted by the server.
             */
            this.recovered = false;
            /**
             * Buffer for packets received before the CONNECT packet
             */
            this.receiveBuffer = [];
            /**
             * Buffer for packets that will be sent once the socket is connected
             */
            this.sendBuffer = [];
            /**
             * The queue of packets to be sent with retry in case of failure.
             *
             * Packets are sent one by one, each waiting for the server acknowledgement, in order to guarantee the delivery order.
             * @private
             */
            this._queue = [];
            /**
             * A sequence to generate the ID of the {@link QueuedPacket}.
             * @private
             */
            this._queueSeq = 0;
            this.ids = 0;
            this.acks = {};
            this.flags = {};
            this.io = io;
            this.nsp = nsp;
            if (opts && opts.auth) {
                this.auth = opts.auth;
            }
            this._opts = Object.assign({}, opts);
            if (this.io._autoConnect)
                this.open();
        }
        /**
         * Whether the socket is currently disconnected
         *
         * @example
         * const socket = io();
         *
         * socket.on("connect", () => {
         *   console.log(socket.disconnected); // false
         * });
         *
         * socket.on("disconnect", () => {
         *   console.log(socket.disconnected); // true
         * });
         */
        get disconnected() {
            return !this.connected;
        }
        /**
         * Subscribe to open, close and packet events
         *
         * @private
         */
        subEvents() {
            if (this.subs)
                return;
            const io = this.io;
            this.subs = [
                on(io, "open", this.onopen.bind(this)),
                on(io, "packet", this.onpacket.bind(this)),
                on(io, "error", this.onerror.bind(this)),
                on(io, "close", this.onclose.bind(this)),
            ];
        }
        /**
         * Whether the Socket will try to reconnect when its Manager connects or reconnects.
         *
         * @example
         * const socket = io();
         *
         * console.log(socket.active); // true
         *
         * socket.on("disconnect", (reason) => {
         *   if (reason === "io server disconnect") {
         *     // the disconnection was initiated by the server, you need to manually reconnect
         *     console.log(socket.active); // false
         *   }
         *   // else the socket will automatically try to reconnect
         *   console.log(socket.active); // true
         * });
         */
        get active() {
            return !!this.subs;
        }
        /**
         * "Opens" the socket.
         *
         * @example
         * const socket = io({
         *   autoConnect: false
         * });
         *
         * socket.connect();
         */
        connect() {
            if (this.connected)
                return this;
            this.subEvents();
            if (!this.io["_reconnecting"])
                this.io.open(); // ensure open
            if ("open" === this.io._readyState)
                this.onopen();
            return this;
        }
        /**
         * Alias for {@link connect()}.
         */
        open() {
            return this.connect();
        }
        /**
         * Sends a `message` event.
         *
         * This method mimics the WebSocket.send() method.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
         *
         * @example
         * socket.send("hello");
         *
         * // this is equivalent to
         * socket.emit("message", "hello");
         *
         * @return self
         */
        send(...args) {
            args.unshift("message");
            this.emit.apply(this, args);
            return this;
        }
        /**
         * Override `emit`.
         * If the event is in `events`, it's emitted normally.
         *
         * @example
         * socket.emit("hello", "world");
         *
         * // all serializable datastructures are supported (no need to call JSON.stringify)
         * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
         *
         * // with an acknowledgement from the server
         * socket.emit("hello", "world", (val) => {
         *   // ...
         * });
         *
         * @return self
         */
        emit(ev, ...args) {
            if (RESERVED_EVENTS.hasOwnProperty(ev)) {
                throw new Error('"' + ev.toString() + '" is a reserved event name');
            }
            args.unshift(ev);
            if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
                this._addToQueue(args);
                return this;
            }
            const packet = {
                type: PacketType.EVENT,
                data: args,
            };
            packet.options = {};
            packet.options.compress = this.flags.compress !== false;
            // event ack callback
            if ("function" === typeof args[args.length - 1]) {
                const id = this.ids++;
                const ack = args.pop();
                this._registerAckCallback(id, ack);
                packet.id = id;
            }
            const isTransportWritable = this.io.engine &&
                this.io.engine.transport &&
                this.io.engine.transport.writable;
            const discardPacket = this.flags.volatile && (!isTransportWritable || !this.connected);
            if (discardPacket) ;
            else if (this.connected) {
                this.notifyOutgoingListeners(packet);
                this.packet(packet);
            }
            else {
                this.sendBuffer.push(packet);
            }
            this.flags = {};
            return this;
        }
        /**
         * @private
         */
        _registerAckCallback(id, ack) {
            var _a;
            const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
            if (timeout === undefined) {
                this.acks[id] = ack;
                return;
            }
            // @ts-ignore
            const timer = this.io.setTimeoutFn(() => {
                delete this.acks[id];
                for (let i = 0; i < this.sendBuffer.length; i++) {
                    if (this.sendBuffer[i].id === id) {
                        this.sendBuffer.splice(i, 1);
                    }
                }
                ack.call(this, new Error("operation has timed out"));
            }, timeout);
            this.acks[id] = (...args) => {
                // @ts-ignore
                this.io.clearTimeoutFn(timer);
                ack.apply(this, [null, ...args]);
            };
        }
        /**
         * Emits an event and waits for an acknowledgement
         *
         * @example
         * // without timeout
         * const response = await socket.emitWithAck("hello", "world");
         *
         * // with a specific timeout
         * try {
         *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
         * } catch (err) {
         *   // the server did not acknowledge the event in the given delay
         * }
         *
         * @return a Promise that will be fulfilled when the server acknowledges the event
         */
        emitWithAck(ev, ...args) {
            // the timeout flag is optional
            const withErr = this.flags.timeout !== undefined || this._opts.ackTimeout !== undefined;
            return new Promise((resolve, reject) => {
                args.push((arg1, arg2) => {
                    if (withErr) {
                        return arg1 ? reject(arg1) : resolve(arg2);
                    }
                    else {
                        return resolve(arg1);
                    }
                });
                this.emit(ev, ...args);
            });
        }
        /**
         * Add the packet to the queue.
         * @param args
         * @private
         */
        _addToQueue(args) {
            let ack;
            if (typeof args[args.length - 1] === "function") {
                ack = args.pop();
            }
            const packet = {
                id: this._queueSeq++,
                tryCount: 0,
                pending: false,
                args,
                flags: Object.assign({ fromQueue: true }, this.flags),
            };
            args.push((err, ...responseArgs) => {
                if (packet !== this._queue[0]) {
                    // the packet has already been acknowledged
                    return;
                }
                const hasError = err !== null;
                if (hasError) {
                    if (packet.tryCount > this._opts.retries) {
                        this._queue.shift();
                        if (ack) {
                            ack(err);
                        }
                    }
                }
                else {
                    this._queue.shift();
                    if (ack) {
                        ack(null, ...responseArgs);
                    }
                }
                packet.pending = false;
                return this._drainQueue();
            });
            this._queue.push(packet);
            this._drainQueue();
        }
        /**
         * Send the first packet of the queue, and wait for an acknowledgement from the server.
         * @param force - whether to resend a packet that has not been acknowledged yet
         *
         * @private
         */
        _drainQueue(force = false) {
            if (!this.connected || this._queue.length === 0) {
                return;
            }
            const packet = this._queue[0];
            if (packet.pending && !force) {
                return;
            }
            packet.pending = true;
            packet.tryCount++;
            this.flags = packet.flags;
            this.emit.apply(this, packet.args);
        }
        /**
         * Sends a packet.
         *
         * @param packet
         * @private
         */
        packet(packet) {
            packet.nsp = this.nsp;
            this.io._packet(packet);
        }
        /**
         * Called upon engine `open`.
         *
         * @private
         */
        onopen() {
            if (typeof this.auth == "function") {
                this.auth((data) => {
                    this._sendConnectPacket(data);
                });
            }
            else {
                this._sendConnectPacket(this.auth);
            }
        }
        /**
         * Sends a CONNECT packet to initiate the Socket.IO session.
         *
         * @param data
         * @private
         */
        _sendConnectPacket(data) {
            this.packet({
                type: PacketType.CONNECT,
                data: this._pid
                    ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data)
                    : data,
            });
        }
        /**
         * Called upon engine or manager `error`.
         *
         * @param err
         * @private
         */
        onerror(err) {
            if (!this.connected) {
                this.emitReserved("connect_error", err);
            }
        }
        /**
         * Called upon engine `close`.
         *
         * @param reason
         * @param description
         * @private
         */
        onclose(reason, description) {
            this.connected = false;
            delete this.id;
            this.emitReserved("disconnect", reason, description);
        }
        /**
         * Called with socket packet.
         *
         * @param packet
         * @private
         */
        onpacket(packet) {
            const sameNamespace = packet.nsp === this.nsp;
            if (!sameNamespace)
                return;
            switch (packet.type) {
                case PacketType.CONNECT:
                    if (packet.data && packet.data.sid) {
                        this.onconnect(packet.data.sid, packet.data.pid);
                    }
                    else {
                        this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
                    }
                    break;
                case PacketType.EVENT:
                case PacketType.BINARY_EVENT:
                    this.onevent(packet);
                    break;
                case PacketType.ACK:
                case PacketType.BINARY_ACK:
                    this.onack(packet);
                    break;
                case PacketType.DISCONNECT:
                    this.ondisconnect();
                    break;
                case PacketType.CONNECT_ERROR:
                    this.destroy();
                    const err = new Error(packet.data.message);
                    // @ts-ignore
                    err.data = packet.data.data;
                    this.emitReserved("connect_error", err);
                    break;
            }
        }
        /**
         * Called upon a server event.
         *
         * @param packet
         * @private
         */
        onevent(packet) {
            const args = packet.data || [];
            if (null != packet.id) {
                args.push(this.ack(packet.id));
            }
            if (this.connected) {
                this.emitEvent(args);
            }
            else {
                this.receiveBuffer.push(Object.freeze(args));
            }
        }
        emitEvent(args) {
            if (this._anyListeners && this._anyListeners.length) {
                const listeners = this._anyListeners.slice();
                for (const listener of listeners) {
                    listener.apply(this, args);
                }
            }
            super.emit.apply(this, args);
            if (this._pid && args.length && typeof args[args.length - 1] === "string") {
                this._lastOffset = args[args.length - 1];
            }
        }
        /**
         * Produces an ack callback to emit with an event.
         *
         * @private
         */
        ack(id) {
            const self = this;
            let sent = false;
            return function (...args) {
                // prevent double callbacks
                if (sent)
                    return;
                sent = true;
                self.packet({
                    type: PacketType.ACK,
                    id: id,
                    data: args,
                });
            };
        }
        /**
         * Called upon a server acknowlegement.
         *
         * @param packet
         * @private
         */
        onack(packet) {
            const ack = this.acks[packet.id];
            if ("function" === typeof ack) {
                ack.apply(this, packet.data);
                delete this.acks[packet.id];
            }
        }
        /**
         * Called upon server connect.
         *
         * @private
         */
        onconnect(id, pid) {
            this.id = id;
            this.recovered = pid && this._pid === pid;
            this._pid = pid; // defined only if connection state recovery is enabled
            this.connected = true;
            this.emitBuffered();
            this.emitReserved("connect");
            this._drainQueue(true);
        }
        /**
         * Emit buffered events (received and emitted).
         *
         * @private
         */
        emitBuffered() {
            this.receiveBuffer.forEach((args) => this.emitEvent(args));
            this.receiveBuffer = [];
            this.sendBuffer.forEach((packet) => {
                this.notifyOutgoingListeners(packet);
                this.packet(packet);
            });
            this.sendBuffer = [];
        }
        /**
         * Called upon server disconnect.
         *
         * @private
         */
        ondisconnect() {
            this.destroy();
            this.onclose("io server disconnect");
        }
        /**
         * Called upon forced client/server side disconnections,
         * this method ensures the manager stops tracking us and
         * that reconnections don't get triggered for this.
         *
         * @private
         */
        destroy() {
            if (this.subs) {
                // clean subscriptions to avoid reconnections
                this.subs.forEach((subDestroy) => subDestroy());
                this.subs = undefined;
            }
            this.io["_destroy"](this);
        }
        /**
         * Disconnects the socket manually. In that case, the socket will not try to reconnect.
         *
         * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
         *
         * @example
         * const socket = io();
         *
         * socket.on("disconnect", (reason) => {
         *   // console.log(reason); prints "io client disconnect"
         * });
         *
         * socket.disconnect();
         *
         * @return self
         */
        disconnect() {
            if (this.connected) {
                this.packet({ type: PacketType.DISCONNECT });
            }
            // remove socket from pool
            this.destroy();
            if (this.connected) {
                // fire events
                this.onclose("io client disconnect");
            }
            return this;
        }
        /**
         * Alias for {@link disconnect()}.
         *
         * @return self
         */
        close() {
            return this.disconnect();
        }
        /**
         * Sets the compress flag.
         *
         * @example
         * socket.compress(false).emit("hello");
         *
         * @param compress - if `true`, compresses the sending data
         * @return self
         */
        compress(compress) {
            this.flags.compress = compress;
            return this;
        }
        /**
         * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
         * ready to send messages.
         *
         * @example
         * socket.volatile.emit("hello"); // the server may or may not receive it
         *
         * @returns self
         */
        get volatile() {
            this.flags.volatile = true;
            return this;
        }
        /**
         * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
         * given number of milliseconds have elapsed without an acknowledgement from the server:
         *
         * @example
         * socket.timeout(5000).emit("my-event", (err) => {
         *   if (err) {
         *     // the server did not acknowledge the event in the given delay
         *   }
         * });
         *
         * @returns self
         */
        timeout(timeout) {
            this.flags.timeout = timeout;
            return this;
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback.
         *
         * @example
         * socket.onAny((event, ...args) => {
         *   console.log(`got ${event}`);
         * });
         *
         * @param listener
         */
        onAny(listener) {
            this._anyListeners = this._anyListeners || [];
            this._anyListeners.push(listener);
            return this;
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback. The listener is added to the beginning of the listeners array.
         *
         * @example
         * socket.prependAny((event, ...args) => {
         *   console.log(`got event ${event}`);
         * });
         *
         * @param listener
         */
        prependAny(listener) {
            this._anyListeners = this._anyListeners || [];
            this._anyListeners.unshift(listener);
            return this;
        }
        /**
         * Removes the listener that will be fired when any event is emitted.
         *
         * @example
         * const catchAllListener = (event, ...args) => {
         *   console.log(`got event ${event}`);
         * }
         *
         * socket.onAny(catchAllListener);
         *
         * // remove a specific listener
         * socket.offAny(catchAllListener);
         *
         * // or remove all listeners
         * socket.offAny();
         *
         * @param listener
         */
        offAny(listener) {
            if (!this._anyListeners) {
                return this;
            }
            if (listener) {
                const listeners = this._anyListeners;
                for (let i = 0; i < listeners.length; i++) {
                    if (listener === listeners[i]) {
                        listeners.splice(i, 1);
                        return this;
                    }
                }
            }
            else {
                this._anyListeners = [];
            }
            return this;
        }
        /**
         * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
         * e.g. to remove listeners.
         */
        listenersAny() {
            return this._anyListeners || [];
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback.
         *
         * Note: acknowledgements sent to the server are not included.
         *
         * @example
         * socket.onAnyOutgoing((event, ...args) => {
         *   console.log(`sent event ${event}`);
         * });
         *
         * @param listener
         */
        onAnyOutgoing(listener) {
            this._anyOutgoingListeners = this._anyOutgoingListeners || [];
            this._anyOutgoingListeners.push(listener);
            return this;
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback. The listener is added to the beginning of the listeners array.
         *
         * Note: acknowledgements sent to the server are not included.
         *
         * @example
         * socket.prependAnyOutgoing((event, ...args) => {
         *   console.log(`sent event ${event}`);
         * });
         *
         * @param listener
         */
        prependAnyOutgoing(listener) {
            this._anyOutgoingListeners = this._anyOutgoingListeners || [];
            this._anyOutgoingListeners.unshift(listener);
            return this;
        }
        /**
         * Removes the listener that will be fired when any event is emitted.
         *
         * @example
         * const catchAllListener = (event, ...args) => {
         *   console.log(`sent event ${event}`);
         * }
         *
         * socket.onAnyOutgoing(catchAllListener);
         *
         * // remove a specific listener
         * socket.offAnyOutgoing(catchAllListener);
         *
         * // or remove all listeners
         * socket.offAnyOutgoing();
         *
         * @param [listener] - the catch-all listener (optional)
         */
        offAnyOutgoing(listener) {
            if (!this._anyOutgoingListeners) {
                return this;
            }
            if (listener) {
                const listeners = this._anyOutgoingListeners;
                for (let i = 0; i < listeners.length; i++) {
                    if (listener === listeners[i]) {
                        listeners.splice(i, 1);
                        return this;
                    }
                }
            }
            else {
                this._anyOutgoingListeners = [];
            }
            return this;
        }
        /**
         * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
         * e.g. to remove listeners.
         */
        listenersAnyOutgoing() {
            return this._anyOutgoingListeners || [];
        }
        /**
         * Notify the listeners for each packet sent
         *
         * @param packet
         *
         * @private
         */
        notifyOutgoingListeners(packet) {
            if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
                const listeners = this._anyOutgoingListeners.slice();
                for (const listener of listeners) {
                    listener.apply(this, packet.data);
                }
            }
        }
    }

    /**
     * Initialize backoff timer with `opts`.
     *
     * - `min` initial timeout in milliseconds [100]
     * - `max` max timeout [10000]
     * - `jitter` [0]
     * - `factor` [2]
     *
     * @param {Object} opts
     * @api public
     */
    function Backoff(opts) {
        opts = opts || {};
        this.ms = opts.min || 100;
        this.max = opts.max || 10000;
        this.factor = opts.factor || 2;
        this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
        this.attempts = 0;
    }
    /**
     * Return the backoff duration.
     *
     * @return {Number}
     * @api public
     */
    Backoff.prototype.duration = function () {
        var ms = this.ms * Math.pow(this.factor, this.attempts++);
        if (this.jitter) {
            var rand = Math.random();
            var deviation = Math.floor(rand * this.jitter * ms);
            ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
        }
        return Math.min(ms, this.max) | 0;
    };
    /**
     * Reset the number of attempts.
     *
     * @api public
     */
    Backoff.prototype.reset = function () {
        this.attempts = 0;
    };
    /**
     * Set the minimum duration
     *
     * @api public
     */
    Backoff.prototype.setMin = function (min) {
        this.ms = min;
    };
    /**
     * Set the maximum duration
     *
     * @api public
     */
    Backoff.prototype.setMax = function (max) {
        this.max = max;
    };
    /**
     * Set the jitter
     *
     * @api public
     */
    Backoff.prototype.setJitter = function (jitter) {
        this.jitter = jitter;
    };

    class Manager extends Emitter {
        constructor(uri, opts) {
            var _a;
            super();
            this.nsps = {};
            this.subs = [];
            if (uri && "object" === typeof uri) {
                opts = uri;
                uri = undefined;
            }
            opts = opts || {};
            opts.path = opts.path || "/socket.io";
            this.opts = opts;
            installTimerFunctions(this, opts);
            this.reconnection(opts.reconnection !== false);
            this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
            this.reconnectionDelay(opts.reconnectionDelay || 1000);
            this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
            this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
            this.backoff = new Backoff({
                min: this.reconnectionDelay(),
                max: this.reconnectionDelayMax(),
                jitter: this.randomizationFactor(),
            });
            this.timeout(null == opts.timeout ? 20000 : opts.timeout);
            this._readyState = "closed";
            this.uri = uri;
            const _parser = opts.parser || parser;
            this.encoder = new _parser.Encoder();
            this.decoder = new _parser.Decoder();
            this._autoConnect = opts.autoConnect !== false;
            if (this._autoConnect)
                this.open();
        }
        reconnection(v) {
            if (!arguments.length)
                return this._reconnection;
            this._reconnection = !!v;
            return this;
        }
        reconnectionAttempts(v) {
            if (v === undefined)
                return this._reconnectionAttempts;
            this._reconnectionAttempts = v;
            return this;
        }
        reconnectionDelay(v) {
            var _a;
            if (v === undefined)
                return this._reconnectionDelay;
            this._reconnectionDelay = v;
            (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
            return this;
        }
        randomizationFactor(v) {
            var _a;
            if (v === undefined)
                return this._randomizationFactor;
            this._randomizationFactor = v;
            (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
            return this;
        }
        reconnectionDelayMax(v) {
            var _a;
            if (v === undefined)
                return this._reconnectionDelayMax;
            this._reconnectionDelayMax = v;
            (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
            return this;
        }
        timeout(v) {
            if (!arguments.length)
                return this._timeout;
            this._timeout = v;
            return this;
        }
        /**
         * Starts trying to reconnect if reconnection is enabled and we have not
         * started reconnecting yet
         *
         * @private
         */
        maybeReconnectOnOpen() {
            // Only try to reconnect if it's the first time we're connecting
            if (!this._reconnecting &&
                this._reconnection &&
                this.backoff.attempts === 0) {
                // keeps reconnection from firing twice for the same reconnection loop
                this.reconnect();
            }
        }
        /**
         * Sets the current transport `socket`.
         *
         * @param {Function} fn - optional, callback
         * @return self
         * @public
         */
        open(fn) {
            if (~this._readyState.indexOf("open"))
                return this;
            this.engine = new Socket$1(this.uri, this.opts);
            const socket = this.engine;
            const self = this;
            this._readyState = "opening";
            this.skipReconnect = false;
            // emit `open`
            const openSubDestroy = on(socket, "open", function () {
                self.onopen();
                fn && fn();
            });
            // emit `error`
            const errorSub = on(socket, "error", (err) => {
                self.cleanup();
                self._readyState = "closed";
                this.emitReserved("error", err);
                if (fn) {
                    fn(err);
                }
                else {
                    // Only do this if there is no fn to handle the error
                    self.maybeReconnectOnOpen();
                }
            });
            if (false !== this._timeout) {
                const timeout = this._timeout;
                if (timeout === 0) {
                    openSubDestroy(); // prevents a race condition with the 'open' event
                }
                // set timer
                const timer = this.setTimeoutFn(() => {
                    openSubDestroy();
                    socket.close();
                    // @ts-ignore
                    socket.emit("error", new Error("timeout"));
                }, timeout);
                if (this.opts.autoUnref) {
                    timer.unref();
                }
                this.subs.push(function subDestroy() {
                    clearTimeout(timer);
                });
            }
            this.subs.push(openSubDestroy);
            this.subs.push(errorSub);
            return this;
        }
        /**
         * Alias for open()
         *
         * @return self
         * @public
         */
        connect(fn) {
            return this.open(fn);
        }
        /**
         * Called upon transport open.
         *
         * @private
         */
        onopen() {
            // clear old subs
            this.cleanup();
            // mark as open
            this._readyState = "open";
            this.emitReserved("open");
            // add new subs
            const socket = this.engine;
            this.subs.push(on(socket, "ping", this.onping.bind(this)), on(socket, "data", this.ondata.bind(this)), on(socket, "error", this.onerror.bind(this)), on(socket, "close", this.onclose.bind(this)), on(this.decoder, "decoded", this.ondecoded.bind(this)));
        }
        /**
         * Called upon a ping.
         *
         * @private
         */
        onping() {
            this.emitReserved("ping");
        }
        /**
         * Called with data.
         *
         * @private
         */
        ondata(data) {
            try {
                this.decoder.add(data);
            }
            catch (e) {
                this.onclose("parse error", e);
            }
        }
        /**
         * Called when parser fully decodes a packet.
         *
         * @private
         */
        ondecoded(packet) {
            // the nextTick call prevents an exception in a user-provided event listener from triggering a disconnection due to a "parse error"
            nextTick(() => {
                this.emitReserved("packet", packet);
            }, this.setTimeoutFn);
        }
        /**
         * Called upon socket error.
         *
         * @private
         */
        onerror(err) {
            this.emitReserved("error", err);
        }
        /**
         * Creates a new socket for the given `nsp`.
         *
         * @return {Socket}
         * @public
         */
        socket(nsp, opts) {
            let socket = this.nsps[nsp];
            if (!socket) {
                socket = new Socket(this, nsp, opts);
                this.nsps[nsp] = socket;
            }
            else if (this._autoConnect && !socket.active) {
                socket.connect();
            }
            return socket;
        }
        /**
         * Called upon a socket close.
         *
         * @param socket
         * @private
         */
        _destroy(socket) {
            const nsps = Object.keys(this.nsps);
            for (const nsp of nsps) {
                const socket = this.nsps[nsp];
                if (socket.active) {
                    return;
                }
            }
            this._close();
        }
        /**
         * Writes a packet.
         *
         * @param packet
         * @private
         */
        _packet(packet) {
            const encodedPackets = this.encoder.encode(packet);
            for (let i = 0; i < encodedPackets.length; i++) {
                this.engine.write(encodedPackets[i], packet.options);
            }
        }
        /**
         * Clean up transport subscriptions and packet buffer.
         *
         * @private
         */
        cleanup() {
            this.subs.forEach((subDestroy) => subDestroy());
            this.subs.length = 0;
            this.decoder.destroy();
        }
        /**
         * Close the current socket.
         *
         * @private
         */
        _close() {
            this.skipReconnect = true;
            this._reconnecting = false;
            this.onclose("forced close");
            if (this.engine)
                this.engine.close();
        }
        /**
         * Alias for close()
         *
         * @private
         */
        disconnect() {
            return this._close();
        }
        /**
         * Called upon engine close.
         *
         * @private
         */
        onclose(reason, description) {
            this.cleanup();
            this.backoff.reset();
            this._readyState = "closed";
            this.emitReserved("close", reason, description);
            if (this._reconnection && !this.skipReconnect) {
                this.reconnect();
            }
        }
        /**
         * Attempt a reconnection.
         *
         * @private
         */
        reconnect() {
            if (this._reconnecting || this.skipReconnect)
                return this;
            const self = this;
            if (this.backoff.attempts >= this._reconnectionAttempts) {
                this.backoff.reset();
                this.emitReserved("reconnect_failed");
                this._reconnecting = false;
            }
            else {
                const delay = this.backoff.duration();
                this._reconnecting = true;
                const timer = this.setTimeoutFn(() => {
                    if (self.skipReconnect)
                        return;
                    this.emitReserved("reconnect_attempt", self.backoff.attempts);
                    // check again for the case socket closed in above events
                    if (self.skipReconnect)
                        return;
                    self.open((err) => {
                        if (err) {
                            self._reconnecting = false;
                            self.reconnect();
                            this.emitReserved("reconnect_error", err);
                        }
                        else {
                            self.onreconnect();
                        }
                    });
                }, delay);
                if (this.opts.autoUnref) {
                    timer.unref();
                }
                this.subs.push(function subDestroy() {
                    clearTimeout(timer);
                });
            }
        }
        /**
         * Called upon successful reconnect.
         *
         * @private
         */
        onreconnect() {
            const attempt = this.backoff.attempts;
            this._reconnecting = false;
            this.backoff.reset();
            this.emitReserved("reconnect", attempt);
        }
    }

    /**
     * Managers cache.
     */
    const cache = {};
    function lookup(uri, opts) {
        if (typeof uri === "object") {
            opts = uri;
            uri = undefined;
        }
        opts = opts || {};
        const parsed = url(uri, opts.path || "/socket.io");
        const source = parsed.source;
        const id = parsed.id;
        const path = parsed.path;
        const sameNamespace = cache[id] && path in cache[id]["nsps"];
        const newConnection = opts.forceNew ||
            opts["force new connection"] ||
            false === opts.multiplex ||
            sameNamespace;
        let io;
        if (newConnection) {
            io = new Manager(source, opts);
        }
        else {
            if (!cache[id]) {
                cache[id] = new Manager(source, opts);
            }
            io = cache[id];
        }
        if (parsed.query && !opts.query) {
            opts.query = parsed.queryKey;
        }
        return io.socket(parsed.path, opts);
    }
    // so that "lookup" can be used both as a function (e.g. `io(...)`) and as a
    // namespace (e.g. `io.connect(...)`), for backward compatibility
    Object.assign(lookup, {
        Manager,
        Socket,
        io: lookup,
        connect: lookup,
    });

    ////////////////////////////
    // Timer class module
    ////////////////////////////

    // Timer class constructor function
    ////////////////////////////
    // Timer class module
    ////////////////////////////
    // Timer class constructor function
    class Timer {
      constructor() {
        // Timer obtain current time in seconds method
        const getTime = () => {
          const date = new Date();
          let t =
            date.getMilliseconds() / 1000.0 +
            date.getSeconds() +
            date.getMinutes() * 60;
          return t;
        };

        // Timer response method
        this.response = (tag_id = null) => {
          let t = getTime();
          // Global time
          this.globalTime = t;
          this.globalDeltaTime = t - this.oldTime;
          // Time with pause
          if (this.isPause) {
            this.localDeltaTime = 0;
            this.pauseTime += t - this.oldTime;
          } else {
            this.localDeltaTime = this.globalDeltaTime;
            this.localTime = t - this.pauseTime - this.startTime;
          }
          // FPS
          this.frameCounter++;
          if (t - this.oldTimeFPS > 3) {
            this.FPS = this.frameCounter / (t - this.oldTimeFPS);
            this.oldTimeFPS = t;
            this.frameCounter = 0;
            if (tag_id != null)
              document.getElementById(tag_id).innerHTML = this.getFPS();
          }
          this.oldTime = t;
        };

        // Obtain FPS as string method
        this.getFPS = () => this.FPS.toFixed(3);

        // Fill timer global data
        this.globalTime = this.localTime = getTime();
        this.globalDeltaTime = this.localDeltaTime = 0;

        // Fill timer semi global data
        this.startTime = this.oldTime = this.oldTimeFPS = this.globalTime;
        this.frameCounter = 0;
        this.isPause = false;
        this.FPS = 30.0;
        this.pauseTime = 0;

        return this;
      }
    } // End of 'Timer' function

    // Math implementations file

    /***
     * Vectors
     ***/

    // 3D vector class
    class _vec3 {
        // Set vector
        constructor(x, y, z) {
            if (x == undefined) {
                (this.x = 0), (this.y = 0), (this.z = 0);
            } else if (typeof x == "object") {
                if (x.length == 3) {
                    (this.x = x[0]), (this.y = x[1]), (this.z = x[2]);
                } else {
                    (this.x = x.x), (this.y = x.y), (this.z = x.z);
                }
            } else {
                if (y == undefined && z == undefined) {
                    (this.x = x), (this.y = x), (this.z = x);
                } else {
                    (this.x = x), (this.y = y), (this.z = z);
                }
            }
        }

        set(x, y, z) {
            (this.x = x), (this.y = y), (this.z = z);
            return this;
        }

        // Add two vectors function
        add(vec) {
            return vec3$1(this.x + vec.x, this.y + vec.y, this.z + vec.z);
        }
        // Subtract two vectors function
        sub(vec) {
            return vec3$1(this.x - vec.x, this.y - vec.y, this.z - vec.z);
        }
        // Multiply function
        mul(v) {
            if (typeof v == "number")
                return vec3$1(this.x * v, this.y * v, this.z * v);
            return vec3$1(this.x * v.x, this.y * v.y, this.z * v.z);
        }
        // Divide function
        div(v) {
            if (typeof v == "number") {
                if (v == 0) alert("Division by zero!");
                if (v == 1) return this;
                return vec3$1(this.x / v, this.y / v, this.z / v);
            }
            return vec3$1(this.x / v.x, this.y / v.y, this.z / v.z);
        }
        // Negate vectir function
        neg() {
            return vec3$1(-this.x, -this.y, -this.z);
        }
        // Two vectors dot product function
        dot(vec) {
            return this.x * vec.x + this.y * vec.y + this.z * vec.z;
        }
        // Two vectors cross product function
        cross(vec) {
            return vec3$1(
                this.y * vec.z - this.z * vec.y,
                this.z * vec.x - this.x * vec.z,
                this.x * vec.y - this.y * vec.x
            );
        }
        // Get length of vector function
        length() {
            let len = this.dot(this);

            if (len == 1 || len == 0) return len;
            return Math.sqrt(len);
        }
        // Get length * length of vector function
        length2() {
            return this.dot(this);
        }
        // Normalize vector function
        normalize() {
            let len = this.dot(this);

            if (len == 1 || len == 0) return this;
            return this.div(Math.sqrt(len));
        }
        // Get array from vec3
        toArray() {
            return [this.x, this.y, this.z];
        }
        // Transform point of vector function
        pointTransform(mat) {
            return vec3$1(
                this.x * mat.m[0][0] +
                    this.y * mat.m[1][0] +
                    this.z * mat.m[2][0] +
                    mat.m[3][0],
                this.x * mat.m[0][1] +
                    this.y * mat.m[1][1] +
                    this.z * mat.m[2][1] +
                    mat.m[3][1],
                this.x * mat.m[0][2] +
                    this.y * mat.m[1][2] +
                    this.z * mat.m[2][2] +
                    mat.m[3][2]
            );
        }
        // Vector transform function
        transform(mat) {
            return vec3$1(
                this.x * mat.m[0][0] + this.y * mat.m[1][0] + this.z * mat.m[2][0],
                this.x * mat.m[0][1] + this.y * mat.m[1][1] + this.z * mat.m[2][1],
                this.x * mat.m[0][2] + this.y * mat.m[1][2] + this.z * mat.m[2][2]
            );
        }
        // Vector by matrix multiplication function
        mulMatr(mat) {
            let w =
                this.x * mat.m[0][3] +
                this.y * mat.m[1][3] +
                this.z * mat.m[2][3] +
                mat.m[3][3];

            return vec3$1(
                (this.x * mat.m[0][0] +
                    this.y * mat.m[1][0] +
                    this.z * mat.m[2][0] +
                    mat.m[3][0]) /
                    w,
                (this.x * mat.m[0][1] +
                    this.y * mat.m[1][1] +
                    this.z * mat.m[2][1] +
                    mat.m[3][1]) /
                    w,
                (this.x * mat.m[0][2] +
                    this.y * mat.m[1][2] +
                    this.z * mat.m[2][2] +
                    mat.m[3][2]) /
                    w
            );
        }
    }
    function vec3$1(...args) {
        return new _vec3(...args);
    }

    // Math implementations file

    /***
     * Vectors
     ***/

    // 3D vector class
    class _vec2 {
        // Set vector
        constructor(x, y) {
            if (x == undefined) {
                (this.x = 0), (this.y = 0);
            } else if (typeof x == "object") {
                if (x.length == 2) {
                    (this.x = x[0]), (this.y = x[1]);
                } else {
                    (this.x = x.x), (this.y = x.y);
                }
            } else {
                if (y == undefined) {
                    (this.x = x), (this.y = x);
                } else {
                    (this.x = x), (this.y = y);
                }
            }
        }

        set(x, y) {
            (this.x = x), (this.y = y);
            return this;
        }

        // Add two vectors function
        add(vec) {
            return vec2(this.x + vec.x, this.y + vec.y);
        }
        // Subtract two vectors function
        sub(vec) {
            return vec2(this.x - vec.x, this.y - vec.y);
        }
        // Multiply function
        mul(v) {
            if (typeof v == "number") return vec2(this.x * v, this.y * v);
            return vec2(this.x * v.x, this.y * v.y);
        }
        // Divide function
        div(v) {
            if (typeof v == "number") {
                if (v == 0) alert("Division by zero!");
                if (v == 1) return this;
                return vec2(this.x / v, this.y / v);
            }
            return vec2(this.x / v.x, this.y / v.y);
        }
        // Two vectors dot product function
        dot(vec) {
            return this.x * vec.x + this.y * vec.y;
        }
        // Get length of vector function
        length() {
            let len = this.dot(this);

            if (len == 1 || len == 0) return len;
            return Math.sqrt(len);
        }
        // Get length * length of vector function
        length2() {
            return this.dot(this);
        }
        // Normalize vector function
        normalize() {
            let len = this.dot(this);

            if (len == 1 || len == 0) return this;
            return this.div(Math.sqrt(len));
        }
        // Get array from vec2
        toArray() {
            return [this.x, this.y];
        }
    }
    function vec2(...args) {
        return new _vec2(...args);
    }

    // Math implementations file

    /***
     * Vectors
     ***/

    // 4D vector class
    class _vec4 {
        // Set vector
        constructor(x, y, z, w) {
            if (x == undefined) {
                (this.x = 0), (this.y = 0), (this.z = 0), (this.w = 0);
            } else if (typeof x == "object") {
                if (x.length == 4) {
                    (this.x = x[0]),
                        (this.y = x[1]),
                        (this.z = x[2]),
                        (this.w = x[3]);
                } else {
                    (this.x = x.x), (this.y = x.y), (this.z = x.z), (this.w = x.w);
                }
            } else {
                if (y == undefined && z == undefined && w == undefined) {
                    (this.x = x), (this.y = x), (this.z = x), (this.w = x);
                } else {
                    (this.x = x), (this.y = y), (this.z = z), (this.w = w);
                }
            }
        }

        set(x, y, z, w) {
            (this.x = x), (this.y = y), (this.z = z), (this.w = w);
            return this;
        }

        // Add two vectors function
        add(vec) {
            return vec4(
                this.x + vec.x,
                this.y + vec.y,
                this.z + vec.z,
                this.w + vec.w
            );
        }
        // Subtract two vectors function
        sub(vec) {
            return vec4(
                this.x - vec.x,
                this.y - vec.y,
                this.z - vec.z,
                this.w - vec.w
            );
        }
        // Multiply function
        mul(v) {
            if (typeof v == "number")
                return vec4(this.x * v, this.y * v, this.z * v, this.w * v);
            return vec3(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w);
        }
        // Divide function
        div(v) {
            if (typeof v == "number") {
                if (v == 0) alert("Division by zero!");
                if (v == 1) return this;
                return vec4(this.x / v, this.y / v, this.z / v, this.w / v);
            }
            return vec4(this.x / v.x, this.y / v.y, this.z / v.z, this.w / v.w);
        }
        // Two vectors dot product function
        dot(vec) {
            return (
                this.x * vec.x + this.y * vec.y + this.z * vec.z + this.w * vec.w
            );
        }
        // Get length of vector function
        length() {
            let len = this.dot(this);

            if (len == 1 || len == 0) return len;
            return Math.sqrt(len);
        }
        // Get length * length of vector function
        length2() {
            return this.dot(this);
        }
        // Normalize vector function
        normalize() {
            let len = this.dot(this);

            if (len == 1 || len == 0) return this;
            return this.div(Math.sqrt(len));
        }
        // Get array from vec3
        toArray() {
            return [this.x, this.y, this.z, this.w];
        }
    }
    function vec4(...args) {
        return new _vec4(...args);
    }

    // export function vec2(...args) {
    //     return new _vec3(...args);
    // }

    // export function vec4(...args) {
    //     return new _vec3(...args);
    // }

    // Math implementations file

    // Degrees to radians conversion
    function D2R(a) {
      return a * (Math.PI / 180.0);
    }

    /***
     * Matrices
     ***/

    class _mat4 {
      constructor(m = null) {
        if (m == null)
          this.m = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
          ];
        else if (typeof m == "object" && m.length == 4) {
          this.m = m;
        } else {
          this.m = m.m;
        }
      }

      mul(m) {
        let matr;

        if (m.length == 4) matr = m;
        else matr = m.m;

        this.m = [
          [
            this.m[0][0] * matr[0][0] +
              this.m[0][1] * matr[1][0] +
              this.m[0][2] * matr[2][0] +
              this.m[0][3] * matr[3][0],
            this.m[0][0] * matr[0][1] +
              this.m[0][1] * matr[1][1] +
              this.m[0][2] * matr[2][1] +
              this.m[0][3] * matr[3][1],
            this.m[0][0] * matr[0][2] +
              this.m[0][1] * matr[1][2] +
              this.m[0][2] * matr[2][2] +
              this.m[0][3] * matr[3][2],
            this.m[0][0] * matr[0][3] +
              this.m[0][1] * matr[1][3] +
              this.m[0][2] * matr[2][3] +
              this.m[0][3] * matr[3][3],
          ],
          [
            this.m[1][0] * matr[0][0] +
              this.m[1][1] * matr[1][0] +
              this.m[1][2] * matr[2][0] +
              this.m[1][3] * matr[3][0],
            this.m[1][0] * matr[0][1] +
              this.m[1][1] * matr[1][1] +
              this.m[1][2] * matr[2][1] +
              this.m[1][3] * matr[3][1],
            this.m[1][0] * matr[0][2] +
              this.m[1][1] * matr[1][2] +
              this.m[1][2] * matr[2][2] +
              this.m[1][3] * matr[3][2],
            this.m[1][0] * matr[0][3] +
              this.m[1][1] * matr[1][3] +
              this.m[1][2] * matr[2][3] +
              this.m[1][3] * matr[3][3],
          ],
          [
            this.m[2][0] * matr[0][0] +
              this.m[2][1] * matr[1][0] +
              this.m[2][2] * matr[2][0] +
              this.m[2][3] * matr[3][0],
            this.m[2][0] * matr[0][1] +
              this.m[2][1] * matr[1][1] +
              this.m[2][2] * matr[2][1] +
              this.m[2][3] * matr[3][1],
            this.m[2][0] * matr[0][2] +
              this.m[2][1] * matr[1][2] +
              this.m[2][2] * matr[2][2] +
              this.m[2][3] * matr[3][2],
            this.m[2][0] * matr[0][3] +
              this.m[2][1] * matr[1][3] +
              this.m[2][2] * matr[2][3] +
              this.m[2][3] * matr[3][3],
          ],
          [
            this.m[3][0] * matr[0][0] +
              this.m[3][1] * matr[1][0] +
              this.m[3][2] * matr[2][0] +
              this.m[3][3] * matr[3][0],
            this.m[3][0] * matr[0][1] +
              this.m[3][1] * matr[1][1] +
              this.m[3][2] * matr[2][1] +
              this.m[3][3] * matr[3][1],
            this.m[3][0] * matr[0][2] +
              this.m[3][1] * matr[1][2] +
              this.m[3][2] * matr[2][2] +
              this.m[3][3] * matr[3][2],
            this.m[3][0] * matr[0][3] +
              this.m[3][1] * matr[1][3] +
              this.m[3][2] * matr[2][3] +
              this.m[3][3] * matr[3][3],
          ],
        ];
        return this;
      }

      // Set translate matrix
      setTranslate(dx, dy, dz) {
        if (typeof dx == "object") {
          this.m = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [dx.x, dx.y, dx.z, 1],
          ];
          return this;
        }
        if (dy == undefined && dz == undefined) {
          this.m = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [dx, dx, dx, 1],
          ];
          return this;
        }
        this.m = [
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [dx, dy, dz, 1],
        ];
        return this;
      }

      // Translate matrix
      translate(dx, dy, dz) {
        if (typeof dx == "object") {
          this.mul([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [dx.x, dx.y, dx.z, 1],
          ]);
          return this;
        }
        if (dy == undefined && dz == undefined) {
          this.mul([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [dx, dx, dx, 1],
          ]);
          return this;
        }
        this.mul([
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [dx, dy, dz, 1],
        ]);
        return this;
      }

      // Matrix determinator 3x3
      determ3x3(a11, a12, a13, a21, a22, a23, a31, a32, a33) {
        return (
          a11 * a22 * a33 -
          a11 * a23 * a32 -
          a12 * a21 * a33 +
          a12 * a23 * a31 +
          a13 * a21 * a32 -
          a13 * a22 * a31
        );
      }

      // Matrix determinator 4x4
      determ() {
        let det =
          this.m[0][0] *
            this.determ3x3(
              this.m[1][1],
              this.m[1][2],
              this.m[1][3],
              this.m[2][1],
              this.m[2][2],
              this.m[2][3],
              this.m[3][1],
              this.m[3][2],
              this.m[3][3]
            ) -
          this.m[0][1] *
            this.determ3x3(
              this.m[1][0],
              this.m[1][2],
              this.m[1][3],
              this.m[2][0],
              this.m[2][2],
              this.m[2][3],
              this.m[3][0],
              this.m[3][2],
              this.m[3][3]
            ) +
          this.m[0][2] *
            this.determ3x3(
              this.m[1][0],
              this.m[1][1],
              this.m[1][3],
              this.m[2][0],
              this.m[2][1],
              this.m[2][3],
              this.m[3][0],
              this.m[3][1],
              this.m[3][3]
            ) -
          this.m[0][3] *
            this.determ3x3(
              this.m[1][0],
              this.m[1][1],
              this.m[1][2],
              this.m[2][0],
              this.m[2][1],
              this.m[2][2],
              this.m[3][0],
              this.m[3][1],
              this.m[3][2]
            );

        return det;
      } // End of 'determ' function

      inverse() {
        let r = [[], [], [], []];
        let det = this.determ();

        if (det == 0) {
          let m = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
          ];

          return mat4(m);
        }

        /* Build adjoint matrix */
        r[0][0] =
          this.determ3x3(
            this.m[1][1],
            this.m[1][2],
            this.m[1][3],
            this.m[2][1],
            this.m[2][2],
            this.m[2][3],
            this.m[3][1],
            this.m[3][2],
            this.m[3][3]
          ) / det;
        r[1][0] =
          -this.determ3x3(
            this.m[1][0],
            this.m[1][2],
            this.m[1][3],
            this.m[2][0],
            this.m[2][2],
            this.m[2][3],
            this.m[3][0],
            this.m[3][2],
            this.m[3][3]
          ) / det;
        r[2][0] =
          this.determ3x3(
            this.m[1][0],
            this.m[1][1],
            this.m[1][3],
            this.m[2][0],
            this.m[2][1],
            this.m[2][3],
            this.m[3][0],
            this.m[3][1],
            this.m[3][3]
          ) / det;
        r[3][0] =
          -this.determ3x3(
            this.m[1][0],
            this.m[1][1],
            this.m[1][2],
            this.m[2][0],
            this.m[2][1],
            this.m[2][2],
            this.m[3][0],
            this.m[3][1],
            this.m[3][2]
          ) / det;

        r[0][1] =
          -this.determ3x3(
            this.m[0][1],
            this.m[0][2],
            this.m[0][3],
            this.m[2][1],
            this.m[2][2],
            this.m[2][3],
            this.m[3][1],
            this.m[3][2],
            this.m[3][3]
          ) / det;
        r[1][1] =
          this.determ3x3(
            this.m[0][0],
            this.m[0][2],
            this.m[0][3],
            this.m[2][0],
            this.m[2][2],
            this.m[2][3],
            this.m[3][0],
            this.m[3][2],
            this.m[3][3]
          ) / det;
        r[2][1] =
          -this.determ3x3(
            this.m[0][0],
            this.m[0][1],
            this.m[0][3],
            this.m[2][0],
            this.m[2][1],
            this.m[2][3],
            this.m[3][0],
            this.m[3][1],
            this.m[3][3]
          ) / det;
        r[3][1] =
          this.determ3x3(
            this.m[0][0],
            this.m[0][1],
            this.m[0][2],
            this.m[2][0],
            this.m[2][1],
            this.m[2][2],
            this.m[3][0],
            this.m[3][1],
            this.m[3][2]
          ) / det;

        r[0][2] =
          this.determ3x3(
            this.m[0][1],
            this.m[0][2],
            this.m[0][3],
            this.m[1][1],
            this.m[1][2],
            this.m[1][3],
            this.m[3][1],
            this.m[3][2],
            this.m[3][3]
          ) / det;
        r[1][2] =
          -this.determ3x3(
            this.m[0][0],
            this.m[0][2],
            this.m[0][3],
            this.m[1][0],
            this.m[1][2],
            this.m[1][3],
            this.m[3][0],
            this.m[3][2],
            this.m[3][3]
          ) / det;
        r[2][2] =
          this.determ3x3(
            this.m[0][0],
            this.m[0][1],
            this.m[0][3],
            this.m[1][0],
            this.m[1][1],
            this.m[1][3],
            this.m[3][0],
            this.m[3][1],
            this.m[3][3]
          ) / det;
        r[3][2] =
          -this.determ3x3(
            this.m[0][0],
            this.m[0][1],
            this.m[0][2],
            this.m[1][0],
            this.m[1][1],
            this.m[1][2],
            this.m[3][0],
            this.m[3][1],
            this.m[3][2]
          ) / det;

        r[0][3] =
          -this.determ3x3(
            this.m[0][1],
            this.m[0][2],
            this.m[0][3],
            this.m[1][1],
            this.m[1][2],
            this.m[1][3],
            this.m[2][1],
            this.m[2][2],
            this.m[2][3]
          ) / det;

        r[1][3] =
          this.determ3x3(
            this.m[0][0],
            this.m[0][2],
            this.m[0][3],
            this.m[1][0],
            this.m[1][2],
            this.m[1][3],
            this.m[2][0],
            this.m[2][2],
            this.m[2][3]
          ) / det;
        r[2][3] =
          -this.determ3x3(
            this.m[0][0],
            this.m[0][1],
            this.m[0][3],
            this.m[1][0],
            this.m[1][1],
            this.m[1][3],
            this.m[2][0],
            this.m[2][1],
            this.m[2][3]
          ) / det;
        r[3][3] =
          this.determ3x3(
            this.m[0][0],
            this.m[0][1],
            this.m[0][2],
            this.m[1][0],
            this.m[1][1],
            this.m[1][2],
            this.m[2][0],
            this.m[2][1],
            this.m[2][2]
          ) / det;
        this.m = r;
        return this;
      } // End of 'inverse' function

      // Transposed matrix
      transpose() {
        let r = [[], [], [], []];

        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++) r[i][j] = this.m[j][i];
        return mat4(r);
      } // End of 'transpose' function

      // RotateX matrix
      rotateX(angleDeg) {
        const si = Math.sin(D2R(angleDeg));
        const co = Math.cos(D2R(angleDeg));
        const mr = [
          [1, 0, 0, 0],
          [0, co, si, 0],
          [0, -si, co, 0],
          [0, 0, 0, 1],
        ];

        return this.mul(mr);
      }

      // RotateY matrix
      rotateY(angleDeg) {
        const si = Math.sin(D2R(angleDeg));
        const co = Math.cos(D2R(angleDeg));
        const mr = [
          [co, 0, -si, 0],
          [0, 1, 0, 0],
          [si, 0, co, 0],
          [0, 0, 0, 1],
        ];

        return this.mul(mr);
      }

      // RotateZ matrix
      rotateZ(angleDeg) {
        const si = Math.sin(D2R(angleDeg));
        const co = Math.cos(D2R(angleDeg));
        const mr = [
          [co, si, 0, 0],
          [-si, co, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ];

        return this.mul(mr);
      }

      setRotate(AngleInDegree, R) {
        let a = AngleInDegree * Math.PI,
          sine = Math.sin(a),
          cosine = Math.cos(a);
        let x = 0,
          y = 0,
          z = 1;
        if (typeof R == "object")
          if (R.length == 3) (x = R[0]), (y = R[1]), (z = R[2]);
          else (x = R.x), (y = R.y), (z = R.z);
        // Vector normalize
        let len = x * x + y * y + z * z;
        if (len != 0 && len != 1)
          (len = Math.sqrt(len)), (x /= len), (y /= len), (z /= len);
        this.m[0][0] = cosine + x * x * (1 - cosine);
        this.m[0][1] = x * y * (1 - cosine) + z * sine;
        this.m[0][2] = x * z * (1 - cosine) - y * sine;
        this.m[0][3] = 0;
        this.m[1][0] = y * x * (1 - cosine) - z * sine;
        this.m[1][1] = cosine + y * y * (1 - cosine);
        this.m[1][2] = y * z * (1 - cosine) + x * sine;
        this.m[1][3] = 0;
        this.m[2][0] = z * x * (1 - cosine) + y * sine;
        this.m[2][1] = z * y * (1 - cosine) - x * sine;
        this.m[2][2] = cosine + z * z * (1 - cosine);
        this.m[2][3] = 0;
        this.m[3][0] = 0;
        this.m[3][1] = 0;
        this.m[3][2] = 0;
        this.m[3][3] = 1;
        return this;
      } // End of 'setRotate' function

      rotate(AngleInDegree, R) {
        return this.mul(mat4().setRotate(AngleInDegree, R));
      } // End of 'rotate' function

      setView(Loc, At, Up1) {
        let Dir = At.sub(Loc).normalize(),
          Right = Dir.cross(Up1).normalize(),
          Up = Right.cross(Dir).normalize();
        this.m = [
          [Right.x, Up.x, -Dir.x, 0],
          [Right.y, Up.y, -Dir.y, 0],
          [Right.z, Up.z, -Dir.z, 0],
          [-Loc.dot(Right), -Loc.dot(Up), Loc.dot(Dir), 1],
        ];
        return this;
      } // End of 'setView' function

      setOrtho(Left, Right, Bottom, Top, Near, Far) {
        this.m = [
          [2 / (Right - Left), 0, 0, 0],
          [0, 2 / (Top - Bottom), 0, 0],
          [0, 0, -2 / (Far - Near), 0],
          [
            -(Right + Left) / (Right - Left),
            -(Top + Bottom) / (Top - Bottom),
            -(Far + Near) / (Far - Near),
            1,
          ],
        ];
        return this;
      } // End of 'setOrtho' function

      setFrustum(Left, Right, Bottom, Top, Near, Far) {
        this.m = [
          [(2 * Near) / (Right - Left), 0, 0, 0],
          [0, (2 * Near) / (Top - Bottom), 0, 0],
          [
            (Right + Left) / (Right - Left),
            (Top + Bottom) / (Top - Bottom),
            -(Far + Near) / (Far - Near),
            -1,
          ],
          [0, 0, (-2 * Near * Far) / (Far - Near), 0],
        ];
        return this;
      } // End of 'setFrustum' function

      view(Loc, At, Up1) {
        return this.mul(mat4().setView(Loc, At, Up1));
      } // End of 'view' function

      ortho(Left, Right, Bottom, Top, Near, Far) {
        return this.mul(mat4().setOrtho(Left, Right, Bottom, Top, Near, Far));
      } // End of 'ortho' function

      frustum(Left, Right, Bottom, Top, Near, Far) {
        return this.mul(mat4().setFrustum(Left, Right, Bottom, Top, Near, Far));
      } // End if 'frustum' function

      toArray() {
        return [].concat(...this.m);
      } // End of 'toArray' function

      mul2(m1, m2) {
        return mat4(m1).mul(m2);
      } // End of 'mul2' function
    }

    function mat4(...args) {
      return new _mat4(...args);
    }

    class _camera {
      constructor() {
        // Projection properties
        this.projSize = 0.1; // Project plane fit square
        this.projDist = 0.1; // Distance to project plane from viewer (near)
        this.projFarClip = 2000; // Distance to project far clip plane (far)

        // Local size data
        this.frameW = 30; // Frame width
        this.frameH = 30; // Frame height

        // Matrices
        this.matrView = mat4(); // View coordinate system matrix
        this.matrProj = mat4(); // Projection coordinate system matrix
        this.matrVP = mat4(); // View and projection matrix precalculate value

        // Set camera default settings
        this.loc = vec3$1(); // Camera location
        this.at = vec3$1(); // Camera destination
        this.dir = vec3$1(); // Camera Direction
        this.up = vec3$1(); // Camera UP direction
        this.right = vec3$1(); // Camera RIGHT direction
        this.setDef();
      } // End of 'constructor' function

      // Camera parmeters setting function
      set(loc, at, up) {
        this.matrView.setView(loc, at, up);
        this.loc = vec3$1(loc);
        this.at = vec3$1(at);
        this.dir.set(
          -this.matrView.m[0][2],
          -this.matrView.m[1][2],
          -this.matrView.m[2][2]
        );
        this.up.set(
          this.matrView.m[0][1],
          this.matrView.m[1][1],
          this.matrView.m[2][1]
        );
        this.right.set(
          this.matrView.m[0][0],
          this.matrView.m[1][0],
          this.matrView.m[2][0]
        );
        this.matrVP = mat4(this.matrView).mul(this.matrProj);
      } // End of 'set' function

      // Projection parameters setting function.
      setProj(projSize, projDist, projFarClip) {
        let rx = projSize,
          ry = projSize;

        this.projDist = projDist;
        this.projSize = projSize;
        this.projFarClip = projFarClip;

        // Correct aspect ratio
        if (this.frameW > this.frameH) rx *= this.frameW / this.frameH;
        else ry *= this.frameH / this.frameW;
        this.matrProj.setFrustum(
          -rx / 2.0,
          rx / 2.0,
          -ry / 2.0,
          ry / 2.0,
          projDist,
          projFarClip
        );

        // pre-calculate view * proj matrix
        this.matrVP = mat4(this.matrView).mul(this.matrProj);
      } // End of 'setProj' function

      // Resize camera and projection function.
      setSize(frameW, frameH) {
        if (frameW < 1) frameW = 1;
        if (frameH < 1) frameH = 1;
        this.frameW = frameW;
        this.frameH = frameH;
        // Reset projection with new render window size
        this.setProj(this.projSize, this.projDist, this.projFarClip);
      } // End of 'setSize' function

      // Camera set default values function.
      setDef() {
        this.loc.set(0, 15.3, 15.3);
        this.at.set(0, 0, 0);
        this.dir.set(0, 0, -1);
        this.up.set(0, 1, 0);
        this.right.set(1, 0, 0);

        this.projDist = 0.1;
        this.projSize = 0.1;
        this.projFarClip = 6000;

        this.frameW = 47;
        this.frameH = 47;

        this.set(this.loc, this.at, this.up);
        this.setProj(this.projSize, this.projDist, this.projFarClip);
        this.setSize(this.frameW, this.frameH);
      } // End of 'setDef' function
    } // End of 'camera' class

    function camera(...args) {
      return new _camera(args);
    } // End of 'mat4' function

    /* END OF 'camera.js' FILE */

    const canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl2");
    // export let anim;

    // Shaders implementation file

    let shaders = [];
    let shadersSize = 0;

    class _shader {
      constructor(shaderFileNamePrefix) {
        this.name = shaderFileNamePrefix;
        this.vertText = fetchShader(
          "../../../../bin/shaders/" + shaderFileNamePrefix + "/vert.glsl"
        );
        this.fragText = fetchShader(
          "../../../../bin/shaders/" + shaderFileNamePrefix + "/frag.glsl"
        );
      }

      add(vs, fs) {
        const vertexSh = load(gl.VERTEX_SHADER, vs);
        const fragmentSh = load(gl.FRAGMENT_SHADER, fs);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexSh);
        gl.attachShader(this.program, fragmentSh);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          alert("Error link program!");
        }

        shaders[shadersSize] = {
          name: 0,
          program: -1,
        };
        shaders[shadersSize].name = this.name;
        shaders[shadersSize].program = this.program;
        shadersSize++;
      }
    }

    function load(type, source) {
      const shader = gl.createShader(type);

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
          "Error load " +
            (type === gl.VERTEX_SHADER ? "vertex" : "fragment") +
            " shader: " +
            gl.getShaderInfoLog(shader)
        );
      }

      return shader;
    }

    async function fetchShader(shaderURL) {
      try {
        const response = await fetch(shaderURL);
        const text = await response.text();

        return text;
      } catch (err) {
        console.error(err);
      }
    }

    // eslint-disable-next-line no-unused-vars
    function shader(...args) {
      // eslint-disable-next-line no-undef
      return new _shader(...args);
    }

    // Material implementation file

    let materials = [];
    let materialsSize = 0;

    let mtlLib = [["black", [0.0, 0.0, 0.0],             [0.01, 0.01, 0.01],           [0.5, 0.5, 0.5],               32],
      ["Brass",         [0.329412,0.223529,0.027451], [0.780392,0.568627,0.113725], [0.992157,0.941176,0.807843], 27.8974],
      ["orange",        [1,0.5,0],       [1,0.5,0],       [0.393548,0.271906,0.166721],  25.6],
      ["Chrome",        [0.25, 0.25, 0.25],          [0.4, 0.4, 0.4],              [0.774597, 0.774597, 0.774597], 76.8],
      ["Copper",        [0.19125,0.0735,0.0225],     [0.7038,0.27048,0.0828],      [0.256777,0.137622,0.086014],  12.8],
      ["yellow",          [1,1,0],     [1,1,0],    [0.628281,0.555802,0.366065],  51.2],
      ["Peweter",       [0.10588,0.058824,0.113725], [0.427451,0.470588,0.541176], [0.3333,0.3333,0.521569],      9.84615],
      ["Silver",        [0.19225,0.19225,0.19225],   [0.50754,0.50754,0.50754],    [0.508273,0.508273,0.508273],  51.2],
      ["Polished Silver", [0.23125,0.23125,0.23125], [0.2775,0.2775,0.2775],       [0.773911,0.773911,0.773911],  89.6],
      ["blue",     [0, 0, 1],      [0, 0, 1],    [0.297254, 0.30829, 0.306678], 12.8],
      ["red",          [1, 0, 0],  [1, 0, 0],  [0.727811, 0.626959, 0.626959], 76.8],
      ["Polished Gold", [0.24725, 0.2245, 0.0645],   [0.34615, 0.3143, 0.0903],    [0.797357, 0.723991, 0.208006], 83.2],
      ["Polished Bronze", [0.25, 0.148, 0.06475],    [0.4, 0.2368, 0.1036],        [0.774597, 0.458561, 0.200621], 76.8],
      ["Polished Copper", [0.2295, 0.08825, 0.0275], [0.5508, 0.2118, 0.066],      [0.580594, 0.223257, 0.0695701], 51.2],
      ["Jade",          [0.135, 0.2225, 0.1575],     [0.135, 0.2225, 0.1575],      [0.316228, 0.316228, 0.316228], 12.8],
      ["Obsidian",      [0.05375, 0.05, 0.06625],    [0.18275, 0.17, 0.22525],     [0.332741, 0.328634, 0.346435], 38.4],
      ["Pearl",         [0.25, 0.20725, 0.20725],    [1.0, 0.829, 0.829],          [0.296648, 0.296648, 0.296648], 11.264],
      ["green",       [0, 1, 0],    [0, 1, 0],  [0.633, 0.727811, 0.633],       76.8],
      ["Black Rubber",  [0.02, 0.02, 0.02],          [0.01, 0.01, 0.01],           [0.4, 0.4, 0.4],                10.0]];

    class _material {
      constructor(name, ka, kd, ks, ph, trans, textures, shader) {
        // Create material
        if (name == undefined) {
          this.name = "Default material";
          this.ka = vec3$1(0.1);
          this.kd = vec3$1(0.9);
          this.ks = vec3$1(0.3);
          this.ph = 30.0;
          this.trans = 1.0;
          this.textures = [
            null, // tex.texture("../../../../bin/textures/CGSG-Logo.png"),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ];
          this.shader = shaders[0];
        } else {
          this.name = name;
          this.ka = vec3$1(ka);
          this.kd = vec3$1(kd);
          this.ks = vec3$1(ks);
          this.ph = ph;
          this.trans = trans;
          this.textures = textures;
          this.shader = shader;
        }
        materials[materialsSize] = this;
        this.mtlNo = materialsSize++;
      }

      apply(mtlNo) {
        let prg = materials[mtlNo].shader.program;
        if (prg == null || prg == undefined) {
          prg = shaders[0].program;
        } else {
          prg = shaders[mtlNo].program; // TODO
        }
        if (prg == 0) return 0;
        gl.useProgram(prg);

        for (let t in this.textures)
          if (this.textures[t] != null)
            this.textures[t].apply(this.shader, Number(t));

        return prg;
      }
    }

    function material(...args) {
      return new _material(...args);
    }

    function loadMtlLib() {
      for (let i = 0; i < mtlLib.length; i++){
        material(mtlLib[i][0], vec3$1(mtlLib[i][1]), vec3$1(mtlLib[i][2]), vec3$1(mtlLib[i][3]), mtlLib[i][4], 1, null, shader("default"));
      }
    }

    function findMtlByName(name) {
      for (let i = 0; i < materials.length; i++) {
        if (materials[i].name === name) {
          return materials[i];
        }
      }

      return materials[0];
    }

    // Textures implementation file
    // import * as rnd from "../render.js";

    class _texture {
      constructor(fileName) {
        this.id = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([255, 255, 255, 0])
        );

        const img = new Image();
        img.src = fileName;
        img.onload = () => {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img
          );
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_S,
            gl.REPEAT
          );
          gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_WRAP_T,
            gl.REPEAT
          );
          gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR
          );
          gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MAG_FILTER,
            gl.LINEAR
          );
        };
      }
      apply(shd, texUnit) {
        if (shd == undefined || shd.id == undefined || shd.id == null) return;

        let loc = gl.getUniformLocation(shd.id, "Texture0");
        gl.activeTexture(gl.TEXTURE0 + texUnit);
        gl.bindTexture(this.type, this.id);
        gl.uniform1i(loc, texUnit);
      }
    }

    function texture(...args) {
      return new _texture(...args);
    }

    class _vertex {
      constructor(p, t, n, c) {
        if (p == undefined) {
          this.p = vec3$1(0);
          this.t = vec2(0);
          this.n = vec3$1(0);
          this.c = vec4(0);
        } else {
          this.p = vec3$1(p);
          this.t = vec2(t);
          this.n = vec3$1(n);
          this.c = vec4(c);
        }
      }
    }

    function vertex(...args) {
      return new _vertex(...args);
    }

    function getVertexArray(posArray, tcArray, normArray, colArray) {
      let vertexArray = [];
      for (let i = 0; i < posArray.length; i += 3) {
        vertexArray.push(
          vertex(
            posArray != null
              ? vec3$1(posArray[i], posArray[i + 1], posArray[i + 2])
              : vec3$1(0),
            tcArray != null ? vec2(tcArray[i], tcArray[i + 1]) : vec2(0),
            normArray != null
              ? vec3$1(normArray[i], normArray[i + 1], normArray[i + 2])
              : vec3$1(0),
            colArray != null
              ? vec4(colArray[i], colArray[i + 1], colArray[i + 2], colArray[i + 3])
              : vec4(0)
          )
        );
      }
      return vertexArray;
    }

    function toArray(vertexArray) {
      let a = [];

      for (let i = 0; i < vertexArray.length; i++) {
        a.push(vertexArray[i].p.x);
        a.push(vertexArray[i].p.y);
        a.push(vertexArray[i].p.z);
        a.push(vertexArray[i].t.x);
        a.push(vertexArray[i].t.y);
        a.push(vertexArray[i].n.x);
        a.push(vertexArray[i].n.y);
        a.push(vertexArray[i].n.z);
        a.push(vertexArray[i].c.x);
        a.push(vertexArray[i].c.y);
        a.push(vertexArray[i].c.z);
        a.push(vertexArray[i].c.w);
      }
      return a;
    }

    function autoNormals(vertexArray, indexArray) {
      for (let i = 0; i < indexArray.length; i += 3) {
        let p0 = vertexArray[indexArray[i]],
          p1 = vertexArray[indexArray[i + 1]],
          p2 = vertexArray[indexArray[i + 2]];
        const normal = p1.p.sub(p0.p).cross(p2.p.sub(p0.p)).normalize();

        p0.n = normal;
        p1.n = normal;
        p2.n = normal;
        vertexArray[indexArray[i]] = p0;
        vertexArray[indexArray[i + 1]] = p1;
        vertexArray[indexArray[i + 2]] = p2;
      }
      // return vertexArray;
    }

    // Primitives handle module

    // Primitive class
    class _prim {
      constructor(type, vertexArray, indexArray, mtlNo, socketId) {
        if (vertexArray != null) {
          // Generate and bind vertex buffer
          this.vBuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuf);
          // Generate and bind vertex array
          this.vA = gl.createVertexArray();
          gl.bindVertexArray(this.vA);

          // Upload data
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(vertexArray),
            gl.STATIC_DRAW
          );
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 4 * 12, 0);
          gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 12, 4 * 3);
          gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 4 * 12, 4 * 5);
          gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 4 * 12, 4 * 8);
          gl.enableVertexAttribArray(0);
          gl.enableVertexAttribArray(1);
          gl.enableVertexAttribArray(2);
          gl.enableVertexAttribArray(3);
          gl.bindVertexArray(null);
        }
        if (indexArray != null) {
          // Generate and bind index buffer
          this.iBuf = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuf);

          // Upload data
          gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Int32Array(indexArray),
            gl.STATIC_DRAW
          );
          this.numOfElements = indexArray.length;
        } else if (indexArray == null && vertexArray != null) {
          this.numOfElements = vertexArray.length;
        } else this.numOfElements = 0;
        this.transMatrix = mat4();
        if (type != null) {
          this.mtlNo = mtlNo;
          this.type = type;
          this.id = socketId;
        }
      }

      // Primitive drawing function
      draw(worldMatrix) {
        if (worldMatrix == undefined) worldMatrix = mat4();
        const w = mat4().mul2(this.transMatrix, worldMatrix);
        const winv = mat4(w).inverse().transpose();
        const wvp = mat4(w).mul(window.anim.camera.matrVP);

        const progId = materials[this.mtlNo].apply(this.mtlNo);

        let loc;
        // Pass matrices
        if ((loc = gl.getUniformLocation(progId, "MatrW")) != -1)
          gl.uniformMatrix4fv(loc, false, new Float32Array(w.toArray()));
        if ((loc = gl.getUniformLocation(progId, "MatrWInv")) != -1)
          gl.uniformMatrix4fv(loc, false, new Float32Array(winv.toArray()));
        if ((loc = gl.getUniformLocation(progId, "MatrWVP")) != -1)
          gl.uniformMatrix4fv(loc, false, new Float32Array(wvp.toArray()));

        // Pass material data
        if ((loc = gl.getUniformLocation(progId, "Ka")) != -1) {
          let ka = materials[this.mtlNo].ka;
          gl.uniform3f(loc, ka.x, ka.y, ka.z);
        }
        if ((loc = gl.getUniformLocation(progId, "Kd")) != -1) {
          let kd = materials[this.mtlNo].kd;
          gl.uniform3f(loc, kd.x, kd.y, kd.z);
        }
        if ((loc = gl.getUniformLocation(progId, "Ks")) != -1) {
          let ks = materials[this.mtlNo].ks;
          gl.uniform3f(loc, ks.x, ks.y, ks.z);
        }
        if ((loc = gl.getUniformLocation(progId, "Ph")) != -1)
          gl.uniform1f(loc, materials[this.mtlNo].ph);

        // Pass time
        if ((loc = gl.getUniformLocation(progId, "Time")) != -1)
          gl.uniform1f(loc, window.anim.timer.globalTime);

        // Pass camera data
        if ((loc = gl.getUniformLocation(progId, "CamLoc")) != -1)
          gl.uniform3f(
            loc,
            window.anim.camera.loc.x,
            window.anim.camera.loc.y,
            window.anim.camera.loc.z
          );
        if ((loc = gl.getUniformLocation(progId, "CamDir")) != -1)
          gl.uniform3f(
            loc,
            window.anim.camera.dir.x,
            window.anim.camera.dir.y,
            window.anim.camera.dir.z
          );

        gl.bindVertexArray(this.vA);
        if (this.iBuf != undefined) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuf);
          gl.drawElements(this.type, this.numOfElements, gl.UNSIGNED_INT, 0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        } else gl.drawArrays(this.type, 0, this.numOfElements);

        gl.bindVertexArray(null);
      }

      // Sphere creation function
      createSphere(radius, width, height) {
        let vertexArray = [],
          indexArray = [];

        // Create vertex array for sphere
        for (
          let i = 0, k = 0, theta = 0;
          i < height;
          i++, theta += Math.PI / (height - 1)
        )
          for (
            let j = 0, phi = 0;
            j < width;
            j++, phi += (2 * Math.PI) / (width - 1)
          ) {
            vertexArray[k++] = vertex(
              vec3$1(
                radius * Math.sin(theta) * Math.sin(phi),
                radius * Math.cos(theta),
                radius * Math.sin(theta) * Math.cos(phi)
              ),
              vec2(0),
              vec3$1(
                Math.sin(theta) * Math.sin(phi),
                Math.cos(theta),
                Math.sin(theta) * Math.cos(phi)
              ),
              vec4(1, 1, 0, 1)
            );
          }

        // Create index array for sphere
        for (let k = 0, ind = 0, i = 0; i < height - 1; i++, ind++)
          for (let j = 0; j < width - 1; j++, ind++) {
            indexArray[k++] = ind;
            indexArray[k++] = ind + 1;
            indexArray[k++] = ind + width;

            indexArray[k++] = ind + width + 1;
            indexArray[k++] = ind + 1;
            indexArray[k++] = ind + width;
          }

        // Create new sphere primitive
        return new prim(
          gl.TRIANGLES,
          toArray(vertexArray),
          indexArray,
          this.mtlNo,
          this.id
        );
      }

      // Torus creation function
      createTorus(radiusInner, radiusOuther, width, height) {
        let vertexArray = [],
          indexArray = [];

        // Create vertex array for torus
        for (
          let i = 0, k = 0, alpha = 0;
          i < height;
          i++, alpha += (2 * Math.PI) / (height - 1)
        )
          for (
            let j = 0, phi = 0;
            j < width;
            j++, phi += (2 * Math.PI) / (width - 1)
          ) {
            vertexArray[k++] = vertex(
              vec3$1(
                (radiusInner + radiusOuther * Math.cos(alpha)) * Math.sin(phi),
                radiusOuther * Math.sin(alpha),
                (radiusInner + radiusOuther * Math.cos(alpha)) * Math.cos(phi)
              ),
              vec2(0),
              vec3$1(
                Math.cos(alpha) * Math.sin(phi),
                Math.sin(alpha),
                Math.cos(alpha) * Math.cos(phi)
              ),
              vec4(1, 1, 0, 1)
            );
          }

        // Create index array for torus
        for (let i = 0, k = 0, ind = 0; i < height - 1; ind++, i++)
          for (let j = 0; j < width - 1; j++, ind++) {
            indexArray[k++] = ind;
            indexArray[k++] = ind + 1;
            indexArray[k++] = ind + width;

            indexArray[k++] = ind + width + 1;
            indexArray[k++] = ind + 1;
            indexArray[k++] = ind + width;
          }

        // Create new torus primitive
        return new prim(
          gl.TRIANGLES,
          toArray(vertexArray),
          indexArray,
          this.mtlNo,
          this.id
        );
      }

      box(bMin, bMax) {
        const positions = [
          bMax.x, bMax.y, bMin.z, 
          bMax.x, bMax.y, bMax.z, 
          bMax.x, bMin.y, bMax.z, 
          bMax.x, bMin.y, bMin.z, 
          bMin.x, bMax.y, bMax.z, 
          bMin.x, bMax.y, bMin.z, 
          bMin.x, bMin.y, bMin.z, 
          bMin.x, bMin.y, bMax.z, 
          bMin.x, bMax.y, bMax.z, 
          bMax.x, bMax.y, bMax.z, 
          bMax.x, bMax.y, bMin.z, 
          bMin.x, bMax.y, bMin.z,
          bMin.x, bMin.y, bMin.z,
          bMax.x, bMin.y, bMin.z, 
          bMax.x, bMin.y, bMax.z, 
          bMin.x, bMin.y, bMax.z, 
          bMax.x, bMax.y, bMax.z, 
          bMin.x, bMax.y, bMax.z, 
          bMin.x, bMin.y, bMax.z, 
          bMax.x, bMin.y, bMax.z, 
          bMin.x, bMax.y, bMin.z,
          bMax.x, bMax.y, bMin.z, 
          bMax.x, bMin.y, bMin.z, 
          bMin.x, bMin.y, bMin.z,
        ];
        const indices = [
          0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14,
          12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
        ];

        let boxVertexArray = getVertexArray(positions, null, null, null);
        autoNormals(boxVertexArray, indices);

        console.log(boxVertexArray);

        return new prim(gl.TRIANGLES,
          toArray(boxVertexArray),
          indices,
          this.mtlNo,
          this.id);
      }  
    }

    function prim(...args) {
      return new _prim(...args);
    }

    // Render implementatio file
    // import { mtl, tex, shd } from "./res/resource.js";

    let walls = [];
    let mazeH = 10;
    let mazeFloor = 0;
    let mazePos = [
      [vec3$1(-9, mazeFloor, -7), vec3$1(-5, mazeH, -6)],
      [vec3$1(-6, mazeFloor, -9), vec3$1(-5, mazeH, -7)],
     // [vec3(-4, mazeFloor, -2), vec3(1, mazeH, 2)],
      [vec3$1(3, mazeFloor, -11), vec3$1(4, mazeH, -2)],
      [vec3$1(4, mazeFloor, -3), vec3$1(9, mazeH, -2)],
      [vec3$1(8, mazeFloor, -8), vec3$1(9, mazeH, -3)],
      [vec3$1(9, mazeFloor, -8), vec3$1(11, mazeH, -7)],
      [vec3$1(4, mazeFloor, -11), vec3$1(11, mazeH, -10)],
      [vec3$1(6, mazeFloor, 5), vec3$1(7, mazeH, 10)],
      [vec3$1(4, mazeFloor, 7), vec3$1(6, mazeH, 8)],
      [vec3$1(7, mazeFloor, 7), vec3$1(9, mazeH, 8)],
      [vec3$1(-5, mazeFloor, 7), vec3$1(-3, mazeH, 8)],
      [vec3$1(-6, mazeFloor, 6), vec3$1(-5, mazeH, 9)],
      [vec3$1(-8, mazeFloor, 8), vec3$1(-6, mazeH, 10)],
      [vec3$1(-11, mazeFloor, 10), vec3$1(-6, mazeH, 12)],
      [vec3$1(-12, mazeFloor, 10), vec3$1(-11, mazeH, 11)],
    ];

    class Render {
      constructor() {
        gl.clearColor(0.3, 0.47, 0.8, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this.shaderDefault = shader("default");
        this.shaderScope = shader("scope");
      }

      resInit() {
        this.material = material();
        this.materialScope = material(
          "Scope material",
          vec3$1(1, 0, 0),
          vec3$1(1, 0, 0),
          vec3$1(1, 0, 0),
          30.0,
          1,
          null,
          shaders[1]
        );
        this.texture = texture();
        const x = 0.01 * canvas.clientHeight / canvas.clientWidth;
        const y = 0.01;
        this.scopePrim = prim(
          gl.TRIANGLE_STRIP,
          new Float32Array([
            -x,
            y,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            -x,
            -y,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            x,
            y,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            x,
            -y,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
          ]),
          null,
          this.materialScope.mtlNo
        );
        this.otherPrimitives = [];

        loadMtlLib();
        for (let x = 0; x < mazePos.length; x++) {
          mazePos[x][0] = mazePos[x][0].mul(5);
          mazePos[x][0].y -= 3;
          mazePos[x][1] = mazePos[x][1].mul(5);
          walls.push(prim(gl.TRIANGLES, null, null, findMtlByName("Obsidian").mtlNo, x).box(mazePos[x][0], mazePos[x][1]));
        }
        this.floor = prim(gl.TRIANGLES, null, null, findMtlByName("Obsidian").mtlNo, x).box(vec3$1(-300, -6, -300), vec3$1(300, -3, 300));

        if (window.otherPlayers !== null) {
          for (let i = 0; i < window.otherPlayers.length; i++) {
            let tmpPrim = prim(gl.TRIANGLES, null, null, findMtlByName(window.otherPlayers[i].color).mtlNo, window.otherPlayers[i].id).createSphere(3, 102, 102);
            this.otherPrimitives.push(tmpPrim);
          }
        }
      }

      createSelfIfNotExists() {
        if (window.player !== null && this.playerPrimitive === undefined) {
          this.playerPrimitive = prim(gl.TRIANGLES, null, null, findMtlByName(window.player.color).mtlNo, window.player.id).createSphere(3, 102, 102);
        }
      }

      getById(obj) {
        for (let i = 0; i < this.otherPrimitives.length; i++) {
          if (this.otherPrimitives[i].id === obj) {
            return i;
          }
        }
        return -1;
      }

      updatePlayers() {
        if (window.otherPlayers !== null) {
          //add
          if (this.otherPrimitives.length < window.otherPlayers.length) {
            let names = [];

            for (let i = 0; i < window.otherPlayers.length; i++) {
              let flag = 0;
              for (let j = 0; j < this.otherPrimitives.length; j++) {
                 if (this.otherPrimitives[j].id === window.otherPlayers[i].id) {
                  flag = 1;
                 }
              }
              if (flag === 0) {
                names.push(window.otherPlayers[i]);
              }
            }

            for (let g = 0; g < names.length; g++) {
              let tmpPr = prim(gl.TRIANGLES, null, null, findMtlByName(names[g].color).mtlNo, names[g].id).createSphere(3, 102, 102);
              this.otherPrimitives.push(tmpPr);
            }
          }

          //delete
          if (this.otherPrimitives.length > window.otherPlayers.length) {
            let buf = [];
            for (let x = 0; x < this.otherPrimitives.length; x++) {
              let flg = 0;
              for (let y = 0; y < window.otherPlayers.length; y++) {
                if (this.otherPrimitives[x].id === window.otherPlayers[y].id) {
                  flg = 1;
                }
              }
              if (flg === 0) {
                buf.push(x);
              }
            }

            for (let z = 0; z < buf.length; z++) {
              this.otherPrimitives.splice(buf[z], 1);
            }
          }
        }
      }

      drawWalls() {
        for (let x = 0; x < walls.length; x++) {
          walls[x].draw();
        }
      }

      drawSelf() {
        // Draw player ptimitive
        if (window.player !== null) {
          this.playerPrimitive.draw(mat4().setTranslate(window.player.x, window.player.y, window.player.z));
        }
      }

      drawOther() {
        // Draw other primitives
        if (window.otherPlayers !== null) {
          for (let i = 0; i < window.otherPlayers.length; i++) {
            this.otherPrimitives[this.getById(window.otherPlayers[i].id)].draw(mat4().setTranslate(window.otherPlayers[i].x, window.otherPlayers[i].y, window.otherPlayers[i].z));
          }
        }
      }

      latentCamera() {
        if (window.player != null) {
          let pos = vec3$1(window.player.x, window.player.y, window.player.z);
          let dir = vec3$1(0, 0, -1).normalize();
          let norm = vec3$1(0, 1, 0);
          let camOld = vec3$1(window.anim.camera.loc);
          let camNew = pos.add(dir.mul(-18).add(norm.mul(8)));
          window.anim.camera.set(
            camOld.add(
              camNew.sub(camOld).mul(Math.sqrt(window.anim.timer.globalDeltaTime))
            ),
            pos.add(dir.mul(18)).add(norm.mul(-8)),
            norm
          );
        }
      }

      render() {
        gl.clearColor(0.3, 0.47, 0.8, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);


        this.floor.draw();
        this.drawWalls();
        this.createSelfIfNotExists();

        // Draw players
        this.updatePlayers();
        this.drawSelf();
        this.drawOther();

        // Draw scope
        this.scopePrim.draw();
      }
    }

    // Collision detection implementation file

    // Ray class module
    class _ray {
      constructor(org, dir) {
        this.org = vec3$1(org);
        this.dir = vec3$1(dir).normalize();
      }
    }

    function ray(...args) {
      return new _ray(...args);
    }

    // Sphere class module
    class _sphere {
      constructor(center, radius) {
        this.c = center;
        this.r = radius;
      }
    }

    function sphere(...args) {
      return new _sphere(...args);
    }

    function rayIntersectSphere(ray, sphere) {
      const orgCenter = sphere.c.sub(ray.org);
      const t = orgCenter.dot(ray.dir);
      const d2 = orgCenter.length2() - t * t;

      if (orgCenter.dot(ray.dir) <= 0) return false;
      if (d2 >= sphere.r * sphere.r) return false;

      return true;
    }

    function checkCollisionSphereAndSphere(pos1, rad1, pos2, rad2) {
      if (Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2) + Math.pow(pos2.z - pos1.z, 2) <= Math.pow(rad1 + rad2, 2)) {
        return true;
      }

      return false;
    }

    function checkCollisionSphereAndBox(bmin, bmax, c, r) {
      let r2 = r * r;
      let dmin = 0;

      c = [c.x, c.y, c.z];
      bmin = [bmin.x, bmin.y, bmin.z];
      bmax = [bmax.x, bmax.y, bmax.z];

      for (let i = 0; i < 3; i++) {
        if (c[i] < bmin[i]) {
          dmin += Math.pow(c[i] - bmin[i], 2);
        } else if (c[i] > bmax[i]) {
          dmin += Math.pow(c[i] - bmax[i], 2);
        }
      }

      if (dmin <= r2) {
        return true;
      }
      return false;
    }

    // Input system implementation file

    class _control {
      constructor() {
        this.dir = vec3$1(0, 0, -1);
        this.pos = vec3$1(0);
        this.posOld = vec3$1(0);
        this.deltaPos = vec3$1(0);
        this.norm = vec3$1(0, 1, 0);
        this.right = vec3$1(1, 0, 0);
        this.speed = 53.0;
      }
      response() {
        this.dir = this.dir
          .mulMatr(
            mat4()
              .rotateY(window.anim.timer.globalDeltaTime * -18 * window.mouseDx)
              .rotate(
                window.anim.timer.globalDeltaTime * -0.1 * window.mouseDy,
                this.right
              )
          )
          .normalize();

        if (window.player !== null) {
          this.deltaPos = vec3$1(0);
          if (window.activeButtons.includes("KeyW")) {
            this.deltaPos = this.dir.mul(
              window.anim.timer.globalDeltaTime * this.speed
            );
            this.deltaPos.y = 0;
          }
          if (window.activeButtons.includes("KeyS")) {
            this.deltaPos = this.dir.mul(
              -window.anim.timer.globalDeltaTime * this.speed
            );
            this.deltaPos.y = 0;
          }
          if (window.activeButtons.includes("KeyD")) {
            this.deltaPos = this.dir
              .cross(this.norm)
              .mul(window.anim.timer.globalDeltaTime * this.speed / 3.0);
            this.deltaPos.y = 0;
          }
          if (window.activeButtons.includes("KeyA")) {
            this.deltaPos = this.dir
              .cross(this.norm)
              .mul(-window.anim.timer.globalDeltaTime * this.speed / 3.0);
            this.deltaPos.y = 0;
          }
          if (window.isClicked) {
            let r = ray(window.anim.camera.loc, window.anim.camera.dir);
            for (let i = 0; i < window.otherPlayers.length; i++) {
              let sph = sphere(
                vec3$1(
                  window.otherPlayers[i].x,
                  window.otherPlayers[i].y,
                  window.otherPlayers[i].z
                ),
                3.0
              );
              if (rayIntersectSphere(r, sph)) {
                window.socket.emit(
                  "MTS:Player_Shoot_Player",
                  [
                    JSON.stringify(window.player),
                    JSON.stringify(window.otherPlayers[i]),
                  ].join("|")
                );
                break;
              }
            }
          }
          this.pos = this.posOld.add(this.deltaPos);
          this.right = this.dir.cross(this.norm).normalize();

          //check collision player-other players
          if (window.otherPlayers !== null) {
            for (let i = 0; i < window.otherPlayers.length; i++) {
              if (checkCollisionSphereAndSphere(vec3$1(this.pos.x, this.pos.y, this.pos.z), 3, vec3$1(window.otherPlayers[i].x, window.otherPlayers[i].y, window.otherPlayers[i].z), 3)) {
                while(checkCollisionSphereAndSphere(vec3$1(this.pos.x, this.pos.y, this.pos.z), 3, vec3$1(window.otherPlayers[i].x, window.otherPlayers[i].y, window.otherPlayers[i].z), 3)) {
                  if (Math.abs(this.deltaPos.x) === 0 && Math.abs(this.deltaPos.y) === 0 && Math.abs(this.deltaPos.z) === 0) {
                    this.deltaPos.x = 1;
                  } else {
                    this.pos = this.pos.sub(this.deltaPos);
                  }
                }
              }
            }
          }

          //check collision player-walls
          for (let i = 0; i < walls.length; i++) {
            if (checkCollisionSphereAndBox(mazePos[i][0], mazePos[i][1], vec3$1(this.pos.x, this.pos.y, this.pos.z), 3)) {
              while(checkCollisionSphereAndBox(mazePos[i][0], mazePos[i][1], vec3$1(this.pos.x, this.pos.y, this.pos.z), 3)) {
                if (Math.abs(this.deltaPos.x) === 0 && Math.abs(this.deltaPos.y) === 0 && Math.abs(this.deltaPos.z) === 0) {
                  this.deltaPos.x = 1;
                } else {
                  this.pos = this.pos.sub(this.deltaPos);
                }
              }
            }
          }

          this.posOld = this.pos;
          {
            window.player.x = this.pos.x;
            window.player.y = this.pos.y;
            window.player.z = this.pos.z;

            //   console.log(this.dir);
            let camOld = vec3$1(window.anim.camera.loc);
            let camNew = this.pos.add(this.dir.mul(-18).add(this.norm.mul(8)));
            window.anim.camera.set(
              camOld.add(
                camNew
                  .sub(camOld)
                  .mul(
                    Math.sqrt(
                      window.mouseDx + window.mouseDy != null
                        ? window.anim.timer.globalDeltaTime * 0.5
                        : 1
                    )
                  )
              ),
              this.pos
                .add(this.dir.mul(18))
                .add(this.norm.mul(0.53))
                .add(this.dir.cross(this.norm).mul(-10)),
              this.norm
            );
          }
          window.socket.emit(
            "MTS:Change_Player_State",
            JSON.stringify(window.player)
          );
        }
        window.mouseDx = 0;
        window.mouseDy = 0;
      }
    }

    function control(...args) {
      return new _control(...args);
    }

    class Anim {
      constructor() {
        this.timer = new Timer();
        this.render = new Render();
        this.camera = camera();
        this.control = control();
      }
      response() {
        this.timer.response();
        this.control.response();
      }
      draw() {
        this.camera.setSize(canvas.clientWidth, canvas.clientHeight);
        this.render.render();
      }
    }

    // Main module
    // import { Render } from "./anim/rnd/render.js";

    function main() {
      window.anim = new Anim();
      Promise.all([
        window.anim.render.shaderDefault.vertText,
        window.anim.render.shaderDefault.fragText,
        window.anim.render.shaderScope.vertText,
        window.anim.render.shaderScope.fragText,
      ]).then((res) => {
        const vsd = res[0];
        const fsd = res[1];
        const vss = res[2];
        const fss = res[3];

        window.anim.render.shaderDefault.add(vsd, fsd);
        window.anim.render.shaderScope.add(vss, fss);
        window.anim.render.resInit();

        const draw = () => {
          window.anim.response();
          window.anim.draw();
          window.requestAnimationFrame(draw);
        };
        draw();
      });
    }

    window.socket = lookup();
    window.activeButtons = [];

    // Mouse data
    window.mouseX = 0;
    window.mouseXOld = 0;
    window.mouseDx = 0;
    window.mouseY = 0;
    window.mouseYOld = 0;
    window.mouseDy = 0;
    window.isClicked = false;

    function addInfoBlock() {
      let block = document.getElementById("wrap");
      block.innerHTML = "";

      if (window.otherPlayers !== null) {
      block.insertAdjacentHTML("beforeend", `<div class="person" style="background-color: black;">
                                            <div class="pers-color" style="background-color: ${window.player.color};"></div>
                                            <div class="pers-name">${window.player.name}</div>
                                            <div class="pers-stat">${window.player.health}/100</div>
                                         </div>`);
      }
      
      if (window.otherPlayers !== null) {
        for (let i = 0; i < window.otherPlayers.length; i++) {
          block.insertAdjacentHTML("beforeend", `<div class="person">
                                              <div class="pers-color" style="background-color: ${window.otherPlayers[i].color};"></div>
                                              <div class="pers-name">${window.otherPlayers[i].name}</div>
                                              <div class="pers-stat">${window.otherPlayers[i].health}/100</div>
                                          </div>`);
        }
      }
    }

    async function mainClient() {
      // client-side
      window.socket.on("connect", () => {
        console.log(window.socket.id); // x8WIv7-mJelg7on_ALbx
      });

      window.socket.on("MFS:Other_Players", function(msg) {
        let tmpPlayers = msg.split('|');
        window.otherPlayers = [];
        
        for (let i = 0; i < tmpPlayers.length; i++) {
          if (tmpPlayers[i] !== "") {
            window.otherPlayers.push(JSON.parse(tmpPlayers[i]));
          }
        }
        addInfoBlock();
      });

      window.socket.on("MFS:Get_Player", function(msg) {
        window.player = JSON.parse(msg);
        addInfoBlock();
      });

      window.socket.on("MFS:Invalid_Name", (msg) => {
        let title = document.getElementById("roomShow");
        let mes = msg.split("|");

        title.innerText = `this name had already taken`;
        title.style.color = "red";
        title.style.fontStyle = "italic";
        document.getElementById("start").value = "GO!";
        document.getElementById("playerName").value = mes[0];
        document.getElementById("room").value = mes[1];
      });

      window.socket.on("disconnect", () => {
        console.log(window.socket.id); // undefined
      });

      window.socket.on("MFS:Game_Over", () => {
        window.location.reload();
      });

      //CREATE PLAYER
      document.getElementById("start").onclick = () => {
        if (window.player === null) {
          let playerName = document.getElementById("playerName").value;
          let playerRoom = document.getElementById("room").value;
          let title = document.getElementById("roomShow");

          if (playerName !== "" && playerRoom !== "" && !playerName.includes(" ") && !playerRoom.includes(" ")) {
            window.socket.emit("MTS:Player_Settings", [playerName, playerRoom].join('|'));
            title.innerText = `Your room is '${playerRoom}'`;
            title.style.color = "aliceblue";
            title.style.fontStyle = "normal";
            document.getElementById("start").value = "LEAVE";
            document.getElementById("playerName").value = "";
            document.getElementById("room").value = "";
          } else {
            title.innerText = `invalid room or player name`;
            title.style.color = "red";
            title.style.fontStyle = "italic";
          }
        } else {
          window.location.reload();
        }
      };

      
      document.addEventListener("keydown", (event) => {
        if (!window.activeButtons.includes(event.code))
          window.activeButtons.push(event.code);
      });

      document.getElementById("cursor").addEventListener("click", async () => {
        await canvas.requestPointerLock({ unadjustedMovement: true });
      });

      document.addEventListener("keyup", (event) => {
        if (window.activeButtons.includes(event.code))
          window.activeButtons.splice(window.activeButtons.indexOf(event.code), 1);
      });

      document.addEventListener("mousemove", (event) => {
        window.mouseDx = event.movementX;
        window.mouseDy = event.movementY;
      });
      document.addEventListener("mousedown", () => {
        window.isClicked = true;
      });
      document.addEventListener("mouseup", () => {
        window.isClicked = false;
      });
    }

    window.addEventListener("load", (event) => {
      window.player = null;
      window.otherPlayers = null;

      mainClient();
      main();
    });

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLXBhcnNlci9idWlsZC9lc20vY29tbW9ucy5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL2J1aWxkL2VzbS9lbmNvZGVQYWNrZXQuYnJvd3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL2J1aWxkL2VzbS9jb250cmliL2Jhc2U2NC1hcnJheWJ1ZmZlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL2J1aWxkL2VzbS9kZWNvZGVQYWNrZXQuYnJvd3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL2J1aWxkL2VzbS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9Ac29ja2V0LmlvL2NvbXBvbmVudC1lbWl0dGVyL2luZGV4Lm1qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS9nbG9iYWxUaGlzLmJyb3dzZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vdXRpbC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS90cmFuc3BvcnQuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vY29udHJpYi95ZWFzdC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS9jb250cmliL3BhcnNlcXMuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vY29udHJpYi9oYXMtY29ycy5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS90cmFuc3BvcnRzL3htbGh0dHByZXF1ZXN0LmJyb3dzZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vdHJhbnNwb3J0cy9wb2xsaW5nLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvYnVpbGQvZXNtL3RyYW5zcG9ydHMvd2Vic29ja2V0LWNvbnN0cnVjdG9yLmJyb3dzZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vdHJhbnNwb3J0cy93ZWJzb2NrZXQuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vdHJhbnNwb3J0cy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS9jb250cmliL3BhcnNldXJpLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvYnVpbGQvZXNtL3NvY2tldC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2J1aWxkL2VzbS91cmwuanMiLCIuLi9ub2RlX21vZHVsZXMvc29ja2V0LmlvLXBhcnNlci9idWlsZC9lc20vaXMtYmluYXJ5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3NvY2tldC5pby1wYXJzZXIvYnVpbGQvZXNtL2JpbmFyeS5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tcGFyc2VyL2J1aWxkL2VzbS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2J1aWxkL2VzbS9vbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2J1aWxkL2VzbS9zb2NrZXQuanMiLCIuLi9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9idWlsZC9lc20vY29udHJpYi9iYWNrbzIuanMiLCIuLi9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9idWlsZC9lc20vbWFuYWdlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2J1aWxkL2VzbS9pbmRleC5qcyIsIi4uL2NsaWVudC9zcmMvYW5pbS90aW1lci5qcyIsIi4uL2NsaWVudC9zcmMvbXRoL3ZlYzMuanMiLCIuLi9jbGllbnQvc3JjL210aC92ZWMyLmpzIiwiLi4vY2xpZW50L3NyYy9tdGgvdmVjNC5qcyIsIi4uL2NsaWVudC9zcmMvbXRoL21hdDQuanMiLCIuLi9jbGllbnQvc3JjL210aC9jYW1lcmEuanMiLCIuLi9jbGllbnQvc3JjL2dsLmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL3JuZC9yZXMvc2hhZGVyLmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL3JuZC9yZXMvbWF0ZXJpYWwuanMiLCIuLi9jbGllbnQvc3JjL2FuaW0vcm5kL3Jlcy90ZXh0dXJlLmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL3JuZC92ZXJ0ZXguanMiLCIuLi9jbGllbnQvc3JjL2FuaW0vcm5kL3ByaW1pdGl2ZS5qcyIsIi4uL2NsaWVudC9zcmMvYW5pbS9ybmQvcmVuZGVyLmpzIiwiLi4vY2xpZW50L3NyYy9tdGgvY29sbGlzaW9uLmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL2lucHV0LmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL2FuaW1hdGlvbi5qcyIsIi4uL2NsaWVudC9zcmMvbWFpbi5qcyIsIi4uL2NsaWVudC9jbGllbnQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgUEFDS0VUX1RZUEVTID0gT2JqZWN0LmNyZWF0ZShudWxsKTsgLy8gbm8gTWFwID0gbm8gcG9seWZpbGxcblBBQ0tFVF9UWVBFU1tcIm9wZW5cIl0gPSBcIjBcIjtcblBBQ0tFVF9UWVBFU1tcImNsb3NlXCJdID0gXCIxXCI7XG5QQUNLRVRfVFlQRVNbXCJwaW5nXCJdID0gXCIyXCI7XG5QQUNLRVRfVFlQRVNbXCJwb25nXCJdID0gXCIzXCI7XG5QQUNLRVRfVFlQRVNbXCJtZXNzYWdlXCJdID0gXCI0XCI7XG5QQUNLRVRfVFlQRVNbXCJ1cGdyYWRlXCJdID0gXCI1XCI7XG5QQUNLRVRfVFlQRVNbXCJub29wXCJdID0gXCI2XCI7XG5jb25zdCBQQUNLRVRfVFlQRVNfUkVWRVJTRSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5PYmplY3Qua2V5cyhQQUNLRVRfVFlQRVMpLmZvckVhY2goa2V5ID0+IHtcbiAgICBQQUNLRVRfVFlQRVNfUkVWRVJTRVtQQUNLRVRfVFlQRVNba2V5XV0gPSBrZXk7XG59KTtcbmNvbnN0IEVSUk9SX1BBQ0tFVCA9IHsgdHlwZTogXCJlcnJvclwiLCBkYXRhOiBcInBhcnNlciBlcnJvclwiIH07XG5leHBvcnQgeyBQQUNLRVRfVFlQRVMsIFBBQ0tFVF9UWVBFU19SRVZFUlNFLCBFUlJPUl9QQUNLRVQgfTtcbiIsImltcG9ydCB7IFBBQ0tFVF9UWVBFUyB9IGZyb20gXCIuL2NvbW1vbnMuanNcIjtcbmNvbnN0IHdpdGhOYXRpdmVCbG9iID0gdHlwZW9mIEJsb2IgPT09IFwiZnVuY3Rpb25cIiB8fFxuICAgICh0eXBlb2YgQmxvYiAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoQmxvYikgPT09IFwiW29iamVjdCBCbG9iQ29uc3RydWN0b3JdXCIpO1xuY29uc3Qgd2l0aE5hdGl2ZUFycmF5QnVmZmVyID0gdHlwZW9mIEFycmF5QnVmZmVyID09PSBcImZ1bmN0aW9uXCI7XG4vLyBBcnJheUJ1ZmZlci5pc1ZpZXcgbWV0aG9kIGlzIG5vdCBkZWZpbmVkIGluIElFMTBcbmNvbnN0IGlzVmlldyA9IG9iaiA9PiB7XG4gICAgcmV0dXJuIHR5cGVvZiBBcnJheUJ1ZmZlci5pc1ZpZXcgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICA/IEFycmF5QnVmZmVyLmlzVmlldyhvYmopXG4gICAgICAgIDogb2JqICYmIG9iai5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbn07XG5jb25zdCBlbmNvZGVQYWNrZXQgPSAoeyB0eXBlLCBkYXRhIH0sIHN1cHBvcnRzQmluYXJ5LCBjYWxsYmFjaykgPT4ge1xuICAgIGlmICh3aXRoTmF0aXZlQmxvYiAmJiBkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICBpZiAoc3VwcG9ydHNCaW5hcnkpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVCbG9iQXNCYXNlNjQoZGF0YSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpdGhOYXRpdmVBcnJheUJ1ZmZlciAmJlxuICAgICAgICAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IGlzVmlldyhkYXRhKSkpIHtcbiAgICAgICAgaWYgKHN1cHBvcnRzQmluYXJ5KSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlQmxvYkFzQmFzZTY0KG5ldyBCbG9iKFtkYXRhXSksIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBwbGFpbiBzdHJpbmdcbiAgICByZXR1cm4gY2FsbGJhY2soUEFDS0VUX1RZUEVTW3R5cGVdICsgKGRhdGEgfHwgXCJcIikpO1xufTtcbmNvbnN0IGVuY29kZUJsb2JBc0Jhc2U2NCA9IChkYXRhLCBjYWxsYmFjaykgPT4ge1xuICAgIGNvbnN0IGZpbGVSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIGZpbGVSZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCBjb250ZW50ID0gZmlsZVJlYWRlci5yZXN1bHQuc3BsaXQoXCIsXCIpWzFdO1xuICAgICAgICBjYWxsYmFjayhcImJcIiArIChjb250ZW50IHx8IFwiXCIpKTtcbiAgICB9O1xuICAgIHJldHVybiBmaWxlUmVhZGVyLnJlYWRBc0RhdGFVUkwoZGF0YSk7XG59O1xuZXhwb3J0IGRlZmF1bHQgZW5jb2RlUGFja2V0O1xuIiwiLy8gaW1wb3J0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vc29ja2V0aW8vYmFzZTY0LWFycmF5YnVmZmVyXG5jb25zdCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcbi8vIFVzZSBhIGxvb2t1cCB0YWJsZSB0byBmaW5kIHRoZSBpbmRleC5cbmNvbnN0IGxvb2t1cCA9IHR5cGVvZiBVaW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IFtdIDogbmV3IFVpbnQ4QXJyYXkoMjU2KTtcbmZvciAobGV0IGkgPSAwOyBpIDwgY2hhcnMubGVuZ3RoOyBpKyspIHtcbiAgICBsb29rdXBbY2hhcnMuY2hhckNvZGVBdChpKV0gPSBpO1xufVxuZXhwb3J0IGNvbnN0IGVuY29kZSA9IChhcnJheWJ1ZmZlcikgPT4ge1xuICAgIGxldCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKSwgaSwgbGVuID0gYnl0ZXMubGVuZ3RoLCBiYXNlNjQgPSAnJztcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDMpIHtcbiAgICAgICAgYmFzZTY0ICs9IGNoYXJzW2J5dGVzW2ldID4+IDJdO1xuICAgICAgICBiYXNlNjQgKz0gY2hhcnNbKChieXRlc1tpXSAmIDMpIDw8IDQpIHwgKGJ5dGVzW2kgKyAxXSA+PiA0KV07XG4gICAgICAgIGJhc2U2NCArPSBjaGFyc1soKGJ5dGVzW2kgKyAxXSAmIDE1KSA8PCAyKSB8IChieXRlc1tpICsgMl0gPj4gNildO1xuICAgICAgICBiYXNlNjQgKz0gY2hhcnNbYnl0ZXNbaSArIDJdICYgNjNdO1xuICAgIH1cbiAgICBpZiAobGVuICUgMyA9PT0gMikge1xuICAgICAgICBiYXNlNjQgPSBiYXNlNjQuc3Vic3RyaW5nKDAsIGJhc2U2NC5sZW5ndGggLSAxKSArICc9JztcbiAgICB9XG4gICAgZWxzZSBpZiAobGVuICUgMyA9PT0gMSkge1xuICAgICAgICBiYXNlNjQgPSBiYXNlNjQuc3Vic3RyaW5nKDAsIGJhc2U2NC5sZW5ndGggLSAyKSArICc9PSc7XG4gICAgfVxuICAgIHJldHVybiBiYXNlNjQ7XG59O1xuZXhwb3J0IGNvbnN0IGRlY29kZSA9IChiYXNlNjQpID0+IHtcbiAgICBsZXQgYnVmZmVyTGVuZ3RoID0gYmFzZTY0Lmxlbmd0aCAqIDAuNzUsIGxlbiA9IGJhc2U2NC5sZW5ndGgsIGksIHAgPSAwLCBlbmNvZGVkMSwgZW5jb2RlZDIsIGVuY29kZWQzLCBlbmNvZGVkNDtcbiAgICBpZiAoYmFzZTY0W2Jhc2U2NC5sZW5ndGggLSAxXSA9PT0gJz0nKSB7XG4gICAgICAgIGJ1ZmZlckxlbmd0aC0tO1xuICAgICAgICBpZiAoYmFzZTY0W2Jhc2U2NC5sZW5ndGggLSAyXSA9PT0gJz0nKSB7XG4gICAgICAgICAgICBidWZmZXJMZW5ndGgtLTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBhcnJheWJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihidWZmZXJMZW5ndGgpLCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICAgICAgZW5jb2RlZDEgPSBsb29rdXBbYmFzZTY0LmNoYXJDb2RlQXQoaSldO1xuICAgICAgICBlbmNvZGVkMiA9IGxvb2t1cFtiYXNlNjQuY2hhckNvZGVBdChpICsgMSldO1xuICAgICAgICBlbmNvZGVkMyA9IGxvb2t1cFtiYXNlNjQuY2hhckNvZGVBdChpICsgMildO1xuICAgICAgICBlbmNvZGVkNCA9IGxvb2t1cFtiYXNlNjQuY2hhckNvZGVBdChpICsgMyldO1xuICAgICAgICBieXRlc1twKytdID0gKGVuY29kZWQxIDw8IDIpIHwgKGVuY29kZWQyID4+IDQpO1xuICAgICAgICBieXRlc1twKytdID0gKChlbmNvZGVkMiAmIDE1KSA8PCA0KSB8IChlbmNvZGVkMyA+PiAyKTtcbiAgICAgICAgYnl0ZXNbcCsrXSA9ICgoZW5jb2RlZDMgJiAzKSA8PCA2KSB8IChlbmNvZGVkNCAmIDYzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5YnVmZmVyO1xufTtcbiIsImltcG9ydCB7IEVSUk9SX1BBQ0tFVCwgUEFDS0VUX1RZUEVTX1JFVkVSU0UgfSBmcm9tIFwiLi9jb21tb25zLmpzXCI7XG5pbXBvcnQgeyBkZWNvZGUgfSBmcm9tIFwiLi9jb250cmliL2Jhc2U2NC1hcnJheWJ1ZmZlci5qc1wiO1xuY29uc3Qgd2l0aE5hdGl2ZUFycmF5QnVmZmVyID0gdHlwZW9mIEFycmF5QnVmZmVyID09PSBcImZ1bmN0aW9uXCI7XG5jb25zdCBkZWNvZGVQYWNrZXQgPSAoZW5jb2RlZFBhY2tldCwgYmluYXJ5VHlwZSkgPT4ge1xuICAgIGlmICh0eXBlb2YgZW5jb2RlZFBhY2tldCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogXCJtZXNzYWdlXCIsXG4gICAgICAgICAgICBkYXRhOiBtYXBCaW5hcnkoZW5jb2RlZFBhY2tldCwgYmluYXJ5VHlwZSlcbiAgICAgICAgfTtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IGVuY29kZWRQYWNrZXQuY2hhckF0KDApO1xuICAgIGlmICh0eXBlID09PSBcImJcIikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogXCJtZXNzYWdlXCIsXG4gICAgICAgICAgICBkYXRhOiBkZWNvZGVCYXNlNjRQYWNrZXQoZW5jb2RlZFBhY2tldC5zdWJzdHJpbmcoMSksIGJpbmFyeVR5cGUpXG4gICAgICAgIH07XG4gICAgfVxuICAgIGNvbnN0IHBhY2tldFR5cGUgPSBQQUNLRVRfVFlQRVNfUkVWRVJTRVt0eXBlXTtcbiAgICBpZiAoIXBhY2tldFR5cGUpIHtcbiAgICAgICAgcmV0dXJuIEVSUk9SX1BBQ0tFVDtcbiAgICB9XG4gICAgcmV0dXJuIGVuY29kZWRQYWNrZXQubGVuZ3RoID4gMVxuICAgICAgICA/IHtcbiAgICAgICAgICAgIHR5cGU6IFBBQ0tFVF9UWVBFU19SRVZFUlNFW3R5cGVdLFxuICAgICAgICAgICAgZGF0YTogZW5jb2RlZFBhY2tldC5zdWJzdHJpbmcoMSlcbiAgICAgICAgfVxuICAgICAgICA6IHtcbiAgICAgICAgICAgIHR5cGU6IFBBQ0tFVF9UWVBFU19SRVZFUlNFW3R5cGVdXG4gICAgICAgIH07XG59O1xuY29uc3QgZGVjb2RlQmFzZTY0UGFja2V0ID0gKGRhdGEsIGJpbmFyeVR5cGUpID0+IHtcbiAgICBpZiAod2l0aE5hdGl2ZUFycmF5QnVmZmVyKSB7XG4gICAgICAgIGNvbnN0IGRlY29kZWQgPSBkZWNvZGUoZGF0YSk7XG4gICAgICAgIHJldHVybiBtYXBCaW5hcnkoZGVjb2RlZCwgYmluYXJ5VHlwZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4geyBiYXNlNjQ6IHRydWUsIGRhdGEgfTsgLy8gZmFsbGJhY2sgZm9yIG9sZCBicm93c2Vyc1xuICAgIH1cbn07XG5jb25zdCBtYXBCaW5hcnkgPSAoZGF0YSwgYmluYXJ5VHlwZSkgPT4ge1xuICAgIHN3aXRjaCAoYmluYXJ5VHlwZSkge1xuICAgICAgICBjYXNlIFwiYmxvYlwiOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciA/IG5ldyBCbG9iKFtkYXRhXSkgOiBkYXRhO1xuICAgICAgICBjYXNlIFwiYXJyYXlidWZmZXJcIjpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkYXRhOyAvLyBhc3N1bWluZyB0aGUgZGF0YSBpcyBhbHJlYWR5IGFuIEFycmF5QnVmZmVyXG4gICAgfVxufTtcbmV4cG9ydCBkZWZhdWx0IGRlY29kZVBhY2tldDtcbiIsImltcG9ydCBlbmNvZGVQYWNrZXQgZnJvbSBcIi4vZW5jb2RlUGFja2V0LmpzXCI7XG5pbXBvcnQgZGVjb2RlUGFja2V0IGZyb20gXCIuL2RlY29kZVBhY2tldC5qc1wiO1xuY29uc3QgU0VQQVJBVE9SID0gU3RyaW5nLmZyb21DaGFyQ29kZSgzMCk7IC8vIHNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9EZWxpbWl0ZXIjQVNDSUlfZGVsaW1pdGVkX3RleHRcbmNvbnN0IGVuY29kZVBheWxvYWQgPSAocGFja2V0cywgY2FsbGJhY2spID0+IHtcbiAgICAvLyBzb21lIHBhY2tldHMgbWF5IGJlIGFkZGVkIHRvIHRoZSBhcnJheSB3aGlsZSBlbmNvZGluZywgc28gdGhlIGluaXRpYWwgbGVuZ3RoIG11c3QgYmUgc2F2ZWRcbiAgICBjb25zdCBsZW5ndGggPSBwYWNrZXRzLmxlbmd0aDtcbiAgICBjb25zdCBlbmNvZGVkUGFja2V0cyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgcGFja2V0cy5mb3JFYWNoKChwYWNrZXQsIGkpID0+IHtcbiAgICAgICAgLy8gZm9yY2UgYmFzZTY0IGVuY29kaW5nIGZvciBiaW5hcnkgcGFja2V0c1xuICAgICAgICBlbmNvZGVQYWNrZXQocGFja2V0LCBmYWxzZSwgZW5jb2RlZFBhY2tldCA9PiB7XG4gICAgICAgICAgICBlbmNvZGVkUGFja2V0c1tpXSA9IGVuY29kZWRQYWNrZXQ7XG4gICAgICAgICAgICBpZiAoKytjb3VudCA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZW5jb2RlZFBhY2tldHMuam9pbihTRVBBUkFUT1IpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuY29uc3QgZGVjb2RlUGF5bG9hZCA9IChlbmNvZGVkUGF5bG9hZCwgYmluYXJ5VHlwZSkgPT4ge1xuICAgIGNvbnN0IGVuY29kZWRQYWNrZXRzID0gZW5jb2RlZFBheWxvYWQuc3BsaXQoU0VQQVJBVE9SKTtcbiAgICBjb25zdCBwYWNrZXRzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbmNvZGVkUGFja2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBkZWNvZGVkUGFja2V0ID0gZGVjb2RlUGFja2V0KGVuY29kZWRQYWNrZXRzW2ldLCBiaW5hcnlUeXBlKTtcbiAgICAgICAgcGFja2V0cy5wdXNoKGRlY29kZWRQYWNrZXQpO1xuICAgICAgICBpZiAoZGVjb2RlZFBhY2tldC50eXBlID09PSBcImVycm9yXCIpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYWNrZXRzO1xufTtcbmV4cG9ydCBjb25zdCBwcm90b2NvbCA9IDQ7XG5leHBvcnQgeyBlbmNvZGVQYWNrZXQsIGVuY29kZVBheWxvYWQsIGRlY29kZVBhY2tldCwgZGVjb2RlUGF5bG9hZCB9O1xuIiwiLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBFbWl0dGVyKG9iaikge1xuICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcbn1cblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICh0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHRoaXMub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgLy8gYWxsXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNwZWNpZmljIGV2ZW50XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICB2YXIgY2I7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgZXZlbnQgc3BlY2lmaWMgYXJyYXlzIGZvciBldmVudCB0eXBlcyB0aGF0IG5vXG4gIC8vIG9uZSBpcyBzdWJzY3JpYmVkIGZvciB0byBhdm9pZCBtZW1vcnkgbGVhay5cbiAgaWYgKGNhbGxiYWNrcy5sZW5ndGggPT09IDApIHtcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpXG4gICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xuXG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gIH1cblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGFsaWFzIHVzZWQgZm9yIHJlc2VydmVkIGV2ZW50cyAocHJvdGVjdGVkIG1ldGhvZClcbkVtaXR0ZXIucHJvdG90eXBlLmVtaXRSZXNlcnZlZCA9IEVtaXR0ZXIucHJvdG90eXBlLmVtaXQ7XG5cbi8qKlxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgcmV0dXJuIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW107XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgcmV0dXJuICEhIHRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XG59O1xuIiwiZXhwb3J0IGNvbnN0IGdsb2JhbFRoaXNTaGltID0gKCgpID0+IHtcbiAgICBpZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgcmV0dXJuIHdpbmRvdztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBGdW5jdGlvbihcInJldHVybiB0aGlzXCIpKCk7XG4gICAgfVxufSkoKTtcbiIsImltcG9ydCB7IGdsb2JhbFRoaXNTaGltIGFzIGdsb2JhbFRoaXMgfSBmcm9tIFwiLi9nbG9iYWxUaGlzLmpzXCI7XG5leHBvcnQgZnVuY3Rpb24gcGljayhvYmosIC4uLmF0dHIpIHtcbiAgICByZXR1cm4gYXR0ci5yZWR1Y2UoKGFjYywgaykgPT4ge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICBhY2Nba10gPSBvYmpba107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG59XG4vLyBLZWVwIGEgcmVmZXJlbmNlIHRvIHRoZSByZWFsIHRpbWVvdXQgZnVuY3Rpb25zIHNvIHRoZXkgY2FuIGJlIHVzZWQgd2hlbiBvdmVycmlkZGVuXG5jb25zdCBOQVRJVkVfU0VUX1RJTUVPVVQgPSBnbG9iYWxUaGlzLnNldFRpbWVvdXQ7XG5jb25zdCBOQVRJVkVfQ0xFQVJfVElNRU9VVCA9IGdsb2JhbFRoaXMuY2xlYXJUaW1lb3V0O1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxUaW1lckZ1bmN0aW9ucyhvYmosIG9wdHMpIHtcbiAgICBpZiAob3B0cy51c2VOYXRpdmVUaW1lcnMpIHtcbiAgICAgICAgb2JqLnNldFRpbWVvdXRGbiA9IE5BVElWRV9TRVRfVElNRU9VVC5iaW5kKGdsb2JhbFRoaXMpO1xuICAgICAgICBvYmouY2xlYXJUaW1lb3V0Rm4gPSBOQVRJVkVfQ0xFQVJfVElNRU9VVC5iaW5kKGdsb2JhbFRoaXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgb2JqLnNldFRpbWVvdXRGbiA9IGdsb2JhbFRoaXMuc2V0VGltZW91dC5iaW5kKGdsb2JhbFRoaXMpO1xuICAgICAgICBvYmouY2xlYXJUaW1lb3V0Rm4gPSBnbG9iYWxUaGlzLmNsZWFyVGltZW91dC5iaW5kKGdsb2JhbFRoaXMpO1xuICAgIH1cbn1cbi8vIGJhc2U2NCBlbmNvZGVkIGJ1ZmZlcnMgYXJlIGFib3V0IDMzJSBiaWdnZXIgKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Jhc2U2NClcbmNvbnN0IEJBU0U2NF9PVkVSSEVBRCA9IDEuMzM7XG4vLyB3ZSBjb3VsZCBhbHNvIGhhdmUgdXNlZCBgbmV3IEJsb2IoW29ial0pLnNpemVgLCBidXQgaXQgaXNuJ3Qgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0IGZ1bmN0aW9uIGJ5dGVMZW5ndGgob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIHV0ZjhMZW5ndGgob2JqKTtcbiAgICB9XG4gICAgLy8gYXJyYXlidWZmZXIgb3IgYmxvYlxuICAgIHJldHVybiBNYXRoLmNlaWwoKG9iai5ieXRlTGVuZ3RoIHx8IG9iai5zaXplKSAqIEJBU0U2NF9PVkVSSEVBRCk7XG59XG5mdW5jdGlvbiB1dGY4TGVuZ3RoKHN0cikge1xuICAgIGxldCBjID0gMCwgbGVuZ3RoID0gMDtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHN0ci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBpZiAoYyA8IDB4ODApIHtcbiAgICAgICAgICAgIGxlbmd0aCArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGMgPCAweDgwMCkge1xuICAgICAgICAgICAgbGVuZ3RoICs9IDI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYyA8IDB4ZDgwMCB8fCBjID49IDB4ZTAwMCkge1xuICAgICAgICAgICAgbGVuZ3RoICs9IDM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBsZW5ndGggKz0gNDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGVuZ3RoO1xufVxuIiwiaW1wb3J0IHsgZGVjb2RlUGFja2V0IH0gZnJvbSBcImVuZ2luZS5pby1wYXJzZXJcIjtcbmltcG9ydCB7IEVtaXR0ZXIgfSBmcm9tIFwiQHNvY2tldC5pby9jb21wb25lbnQtZW1pdHRlclwiO1xuaW1wb3J0IHsgaW5zdGFsbFRpbWVyRnVuY3Rpb25zIH0gZnJvbSBcIi4vdXRpbC5qc1wiO1xuY2xhc3MgVHJhbnNwb3J0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICAgY29uc3RydWN0b3IocmVhc29uLCBkZXNjcmlwdGlvbiwgY29udGV4dCkge1xuICAgICAgICBzdXBlcihyZWFzb24pO1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMudHlwZSA9IFwiVHJhbnNwb3J0RXJyb3JcIjtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgVHJhbnNwb3J0IGV4dGVuZHMgRW1pdHRlciB7XG4gICAgLyoqXG4gICAgICogVHJhbnNwb3J0IGFic3RyYWN0IGNvbnN0cnVjdG9yLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgLSBvcHRpb25zXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy53cml0YWJsZSA9IGZhbHNlO1xuICAgICAgICBpbnN0YWxsVGltZXJGdW5jdGlvbnModGhpcywgb3B0cyk7XG4gICAgICAgIHRoaXMub3B0cyA9IG9wdHM7XG4gICAgICAgIHRoaXMucXVlcnkgPSBvcHRzLnF1ZXJ5O1xuICAgICAgICB0aGlzLnNvY2tldCA9IG9wdHMuc29ja2V0O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbWl0cyBhbiBlcnJvci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZWFzb25cbiAgICAgKiBAcGFyYW0gZGVzY3JpcHRpb25cbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIHRoZSBlcnJvciBjb250ZXh0XG4gICAgICogQHJldHVybiB7VHJhbnNwb3J0fSBmb3IgY2hhaW5pbmdcbiAgICAgKiBAcHJvdGVjdGVkXG4gICAgICovXG4gICAgb25FcnJvcihyZWFzb24sIGRlc2NyaXB0aW9uLCBjb250ZXh0KSB7XG4gICAgICAgIHN1cGVyLmVtaXRSZXNlcnZlZChcImVycm9yXCIsIG5ldyBUcmFuc3BvcnRFcnJvcihyZWFzb24sIGRlc2NyaXB0aW9uLCBjb250ZXh0KSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgdHJhbnNwb3J0LlxuICAgICAqL1xuICAgIG9wZW4oKSB7XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFwib3BlbmluZ1wiO1xuICAgICAgICB0aGlzLmRvT3BlbigpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIHRoZSB0cmFuc3BvcnQuXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IFwib3BlbmluZ1wiIHx8IHRoaXMucmVhZHlTdGF0ZSA9PT0gXCJvcGVuXCIpIHtcbiAgICAgICAgICAgIHRoaXMuZG9DbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5vbkNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNlbmRzIG11bHRpcGxlIHBhY2tldHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYWNrZXRzXG4gICAgICovXG4gICAgc2VuZChwYWNrZXRzKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IFwib3BlblwiKSB7XG4gICAgICAgICAgICB0aGlzLndyaXRlKHBhY2tldHMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhpcyBtaWdodCBoYXBwZW4gaWYgdGhlIHRyYW5zcG9ydCB3YXMgc2lsZW50bHkgY2xvc2VkIGluIHRoZSBiZWZvcmV1bmxvYWQgZXZlbnQgaGFuZGxlclxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIG9wZW5cbiAgICAgKlxuICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgKi9cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFwib3BlblwiO1xuICAgICAgICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgICAgc3VwZXIuZW1pdFJlc2VydmVkKFwib3BlblwiKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdpdGggZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIG9uRGF0YShkYXRhKSB7XG4gICAgICAgIGNvbnN0IHBhY2tldCA9IGRlY29kZVBhY2tldChkYXRhLCB0aGlzLnNvY2tldC5iaW5hcnlUeXBlKTtcbiAgICAgICAgdGhpcy5vblBhY2tldChwYWNrZXQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2l0aCBhIGRlY29kZWQgcGFja2V0LlxuICAgICAqXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIG9uUGFja2V0KHBhY2tldCkge1xuICAgICAgICBzdXBlci5lbWl0UmVzZXJ2ZWQoXCJwYWNrZXRcIiwgcGFja2V0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gY2xvc2UuXG4gICAgICpcbiAgICAgKiBAcHJvdGVjdGVkXG4gICAgICovXG4gICAgb25DbG9zZShkZXRhaWxzKSB7XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFwiY2xvc2VkXCI7XG4gICAgICAgIHN1cGVyLmVtaXRSZXNlcnZlZChcImNsb3NlXCIsIGRldGFpbHMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQYXVzZXMgdGhlIHRyYW5zcG9ydCwgaW4gb3JkZXIgbm90IHRvIGxvc2UgcGFja2V0cyBkdXJpbmcgYW4gdXBncmFkZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvblBhdXNlXG4gICAgICovXG4gICAgcGF1c2Uob25QYXVzZSkgeyB9XG59XG4iLCIvLyBpbXBvcnRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS91bnNoaWZ0aW8veWVhc3Rcbid1c2Ugc3RyaWN0JztcbmNvbnN0IGFscGhhYmV0ID0gJzAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6LV8nLnNwbGl0KCcnKSwgbGVuZ3RoID0gNjQsIG1hcCA9IHt9O1xubGV0IHNlZWQgPSAwLCBpID0gMCwgcHJldjtcbi8qKlxuICogUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgc3BlY2lmaWVkIG51bWJlci5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbnVtIFRoZSBudW1iZXIgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG51bWJlci5cbiAqIEBhcGkgcHVibGljXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGUobnVtKSB7XG4gICAgbGV0IGVuY29kZWQgPSAnJztcbiAgICBkbyB7XG4gICAgICAgIGVuY29kZWQgPSBhbHBoYWJldFtudW0gJSBsZW5ndGhdICsgZW5jb2RlZDtcbiAgICAgICAgbnVtID0gTWF0aC5mbG9vcihudW0gLyBsZW5ndGgpO1xuICAgIH0gd2hpbGUgKG51bSA+IDApO1xuICAgIHJldHVybiBlbmNvZGVkO1xufVxuLyoqXG4gKiBSZXR1cm4gdGhlIGludGVnZXIgdmFsdWUgc3BlY2lmaWVkIGJ5IHRoZSBnaXZlbiBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgc3RyaW5nIHRvIGNvbnZlcnQuXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgaW50ZWdlciB2YWx1ZSByZXByZXNlbnRlZCBieSB0aGUgc3RyaW5nLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZShzdHIpIHtcbiAgICBsZXQgZGVjb2RlZCA9IDA7XG4gICAgZm9yIChpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICBkZWNvZGVkID0gZGVjb2RlZCAqIGxlbmd0aCArIG1hcFtzdHIuY2hhckF0KGkpXTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29kZWQ7XG59XG4vKipcbiAqIFllYXN0OiBBIHRpbnkgZ3Jvd2luZyBpZCBnZW5lcmF0b3IuXG4gKlxuICogQHJldHVybnMge1N0cmluZ30gQSB1bmlxdWUgaWQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5leHBvcnQgZnVuY3Rpb24geWVhc3QoKSB7XG4gICAgY29uc3Qgbm93ID0gZW5jb2RlKCtuZXcgRGF0ZSgpKTtcbiAgICBpZiAobm93ICE9PSBwcmV2KVxuICAgICAgICByZXR1cm4gc2VlZCA9IDAsIHByZXYgPSBub3c7XG4gICAgcmV0dXJuIG5vdyArICcuJyArIGVuY29kZShzZWVkKyspO1xufVxuLy9cbi8vIE1hcCBlYWNoIGNoYXJhY3RlciB0byBpdHMgaW5kZXguXG4vL1xuZm9yICg7IGkgPCBsZW5ndGg7IGkrKylcbiAgICBtYXBbYWxwaGFiZXRbaV1dID0gaTtcbiIsIi8vIGltcG9ydGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2dhbGtuL3F1ZXJ5c3RyaW5nXG4vKipcbiAqIENvbXBpbGVzIGEgcXVlcnlzdHJpbmdcbiAqIFJldHVybnMgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlKG9iaikge1xuICAgIGxldCBzdHIgPSAnJztcbiAgICBmb3IgKGxldCBpIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICBpZiAoc3RyLmxlbmd0aClcbiAgICAgICAgICAgICAgICBzdHIgKz0gJyYnO1xuICAgICAgICAgICAgc3RyICs9IGVuY29kZVVSSUNvbXBvbmVudChpKSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChvYmpbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG4vKipcbiAqIFBhcnNlcyBhIHNpbXBsZSBxdWVyeXN0cmluZyBpbnRvIGFuIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBxc1xuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGUocXMpIHtcbiAgICBsZXQgcXJ5ID0ge307XG4gICAgbGV0IHBhaXJzID0gcXMuc3BsaXQoJyYnKTtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHBhaXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBsZXQgcGFpciA9IHBhaXJzW2ldLnNwbGl0KCc9Jyk7XG4gICAgICAgIHFyeVtkZWNvZGVVUklDb21wb25lbnQocGFpclswXSldID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhaXJbMV0pO1xuICAgIH1cbiAgICByZXR1cm4gcXJ5O1xufVxuIiwiLy8gaW1wb3J0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vY29tcG9uZW50L2hhcy1jb3JzXG5sZXQgdmFsdWUgPSBmYWxzZTtcbnRyeSB7XG4gICAgdmFsdWUgPSB0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICd3aXRoQ3JlZGVudGlhbHMnIGluIG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xufVxuY2F0Y2ggKGVycikge1xuICAgIC8vIGlmIFhNTEh0dHAgc3VwcG9ydCBpcyBkaXNhYmxlZCBpbiBJRSB0aGVuIGl0IHdpbGwgdGhyb3dcbiAgICAvLyB3aGVuIHRyeWluZyB0byBjcmVhdGVcbn1cbmV4cG9ydCBjb25zdCBoYXNDT1JTID0gdmFsdWU7XG4iLCIvLyBicm93c2VyIHNoaW0gZm9yIHhtbGh0dHByZXF1ZXN0IG1vZHVsZVxuaW1wb3J0IHsgaGFzQ09SUyB9IGZyb20gXCIuLi9jb250cmliL2hhcy1jb3JzLmpzXCI7XG5pbXBvcnQgeyBnbG9iYWxUaGlzU2hpbSBhcyBnbG9iYWxUaGlzIH0gZnJvbSBcIi4uL2dsb2JhbFRoaXMuanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBYSFIob3B0cykge1xuICAgIGNvbnN0IHhkb21haW4gPSBvcHRzLnhkb21haW47XG4gICAgLy8gWE1MSHR0cFJlcXVlc3QgY2FuIGJlIGRpc2FibGVkIG9uIElFXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKFwidW5kZWZpbmVkXCIgIT09IHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAmJiAoIXhkb21haW4gfHwgaGFzQ09SUykpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkgeyB9XG4gICAgaWYgKCF4ZG9tYWluKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IGdsb2JhbFRoaXNbW1wiQWN0aXZlXCJdLmNvbmNhdChcIk9iamVjdFwiKS5qb2luKFwiWFwiKV0oXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkgeyB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVHJhbnNwb3J0IH0gZnJvbSBcIi4uL3RyYW5zcG9ydC5qc1wiO1xuaW1wb3J0IHsgeWVhc3QgfSBmcm9tIFwiLi4vY29udHJpYi95ZWFzdC5qc1wiO1xuaW1wb3J0IHsgZW5jb2RlIH0gZnJvbSBcIi4uL2NvbnRyaWIvcGFyc2Vxcy5qc1wiO1xuaW1wb3J0IHsgZW5jb2RlUGF5bG9hZCwgZGVjb2RlUGF5bG9hZCB9IGZyb20gXCJlbmdpbmUuaW8tcGFyc2VyXCI7XG5pbXBvcnQgeyBYSFIgYXMgWE1MSHR0cFJlcXVlc3QgfSBmcm9tIFwiLi94bWxodHRwcmVxdWVzdC5qc1wiO1xuaW1wb3J0IHsgRW1pdHRlciB9IGZyb20gXCJAc29ja2V0LmlvL2NvbXBvbmVudC1lbWl0dGVyXCI7XG5pbXBvcnQgeyBpbnN0YWxsVGltZXJGdW5jdGlvbnMsIHBpY2sgfSBmcm9tIFwiLi4vdXRpbC5qc1wiO1xuaW1wb3J0IHsgZ2xvYmFsVGhpc1NoaW0gYXMgZ2xvYmFsVGhpcyB9IGZyb20gXCIuLi9nbG9iYWxUaGlzLmpzXCI7XG5mdW5jdGlvbiBlbXB0eSgpIHsgfVxuY29uc3QgaGFzWEhSMiA9IChmdW5jdGlvbiAoKSB7XG4gICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KHtcbiAgICAgICAgeGRvbWFpbjogZmFsc2UsXG4gICAgfSk7XG4gICAgcmV0dXJuIG51bGwgIT0geGhyLnJlc3BvbnNlVHlwZTtcbn0pKCk7XG5leHBvcnQgY2xhc3MgUG9sbGluZyBleHRlbmRzIFRyYW5zcG9ydCB7XG4gICAgLyoqXG4gICAgICogWEhSIFBvbGxpbmcgY29uc3RydWN0b3IuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0c1xuICAgICAqIEBwYWNrYWdlXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3B0cykge1xuICAgICAgICBzdXBlcihvcHRzKTtcbiAgICAgICAgdGhpcy5wb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0eXBlb2YgbG9jYXRpb24gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzU1NMID0gXCJodHRwczpcIiA9PT0gbG9jYXRpb24ucHJvdG9jb2w7XG4gICAgICAgICAgICBsZXQgcG9ydCA9IGxvY2F0aW9uLnBvcnQ7XG4gICAgICAgICAgICAvLyBzb21lIHVzZXIgYWdlbnRzIGhhdmUgZW1wdHkgYGxvY2F0aW9uLnBvcnRgXG4gICAgICAgICAgICBpZiAoIXBvcnQpIHtcbiAgICAgICAgICAgICAgICBwb3J0ID0gaXNTU0wgPyBcIjQ0M1wiIDogXCI4MFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy54ZCA9XG4gICAgICAgICAgICAgICAgKHR5cGVvZiBsb2NhdGlvbiAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICAgICAgICAgICAgICBvcHRzLmhvc3RuYW1lICE9PSBsb2NhdGlvbi5ob3N0bmFtZSkgfHxcbiAgICAgICAgICAgICAgICAgICAgcG9ydCAhPT0gb3B0cy5wb3J0O1xuICAgICAgICAgICAgdGhpcy54cyA9IG9wdHMuc2VjdXJlICE9PSBpc1NTTDtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogWEhSIHN1cHBvcnRzIGJpbmFyeVxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgZm9yY2VCYXNlNjQgPSBvcHRzICYmIG9wdHMuZm9yY2VCYXNlNjQ7XG4gICAgICAgIHRoaXMuc3VwcG9ydHNCaW5hcnkgPSBoYXNYSFIyICYmICFmb3JjZUJhc2U2NDtcbiAgICB9XG4gICAgZ2V0IG5hbWUoKSB7XG4gICAgICAgIHJldHVybiBcInBvbGxpbmdcIjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIHNvY2tldCAodHJpZ2dlcnMgcG9sbGluZykuIFdlIHdyaXRlIGEgUElORyBtZXNzYWdlIHRvIGRldGVybWluZVxuICAgICAqIHdoZW4gdGhlIHRyYW5zcG9ydCBpcyBvcGVuLlxuICAgICAqXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIGRvT3BlbigpIHtcbiAgICAgICAgdGhpcy5wb2xsKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBhdXNlcyBwb2xsaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gb25QYXVzZSAtIGNhbGxiYWNrIHVwb24gYnVmZmVycyBhcmUgZmx1c2hlZCBhbmQgdHJhbnNwb3J0IGlzIHBhdXNlZFxuICAgICAqIEBwYWNrYWdlXG4gICAgICovXG4gICAgcGF1c2Uob25QYXVzZSkge1xuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBcInBhdXNpbmdcIjtcbiAgICAgICAgY29uc3QgcGF1c2UgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBcInBhdXNlZFwiO1xuICAgICAgICAgICAgb25QYXVzZSgpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5wb2xsaW5nIHx8ICF0aGlzLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBsZXQgdG90YWwgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMucG9sbGluZykge1xuICAgICAgICAgICAgICAgIHRvdGFsKys7XG4gICAgICAgICAgICAgICAgdGhpcy5vbmNlKFwicG9sbENvbXBsZXRlXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLS10b3RhbCB8fCBwYXVzZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGlzLndyaXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgdG90YWwrKztcbiAgICAgICAgICAgICAgICB0aGlzLm9uY2UoXCJkcmFpblwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC0tdG90YWwgfHwgcGF1c2UoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBhdXNlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogU3RhcnRzIHBvbGxpbmcgY3ljbGUuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHBvbGwoKSB7XG4gICAgICAgIHRoaXMucG9sbGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuZG9Qb2xsKCk7XG4gICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicG9sbFwiKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogT3ZlcmxvYWRzIG9uRGF0YSB0byBkZXRlY3QgcGF5bG9hZHMuXG4gICAgICpcbiAgICAgKiBAcHJvdGVjdGVkXG4gICAgICovXG4gICAgb25EYXRhKGRhdGEpIHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAocGFja2V0KSA9PiB7XG4gICAgICAgICAgICAvLyBpZiBpdHMgdGhlIGZpcnN0IG1lc3NhZ2Ugd2UgY29uc2lkZXIgdGhlIHRyYW5zcG9ydCBvcGVuXG4gICAgICAgICAgICBpZiAoXCJvcGVuaW5nXCIgPT09IHRoaXMucmVhZHlTdGF0ZSAmJiBwYWNrZXQudHlwZSA9PT0gXCJvcGVuXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uT3BlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWYgaXRzIGEgY2xvc2UgcGFja2V0LCB3ZSBjbG9zZSB0aGUgb25nb2luZyByZXF1ZXN0c1xuICAgICAgICAgICAgaWYgKFwiY2xvc2VcIiA9PT0gcGFja2V0LnR5cGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2xvc2UoeyBkZXNjcmlwdGlvbjogXCJ0cmFuc3BvcnQgY2xvc2VkIGJ5IHRoZSBzZXJ2ZXJcIiB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgYnlwYXNzIG9uRGF0YSBhbmQgaGFuZGxlIHRoZSBtZXNzYWdlXG4gICAgICAgICAgICB0aGlzLm9uUGFja2V0KHBhY2tldCk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIGRlY29kZSBwYXlsb2FkXG4gICAgICAgIGRlY29kZVBheWxvYWQoZGF0YSwgdGhpcy5zb2NrZXQuYmluYXJ5VHlwZSkuZm9yRWFjaChjYWxsYmFjayk7XG4gICAgICAgIC8vIGlmIGFuIGV2ZW50IGRpZCBub3QgdHJpZ2dlciBjbG9zaW5nXG4gICAgICAgIGlmIChcImNsb3NlZFwiICE9PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIGdvdCBkYXRhIHdlJ3JlIG5vdCBwb2xsaW5nXG4gICAgICAgICAgICB0aGlzLnBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicG9sbENvbXBsZXRlXCIpO1xuICAgICAgICAgICAgaWYgKFwib3BlblwiID09PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZvciBwb2xsaW5nLCBzZW5kIGEgY2xvc2UgcGFja2V0LlxuICAgICAqXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIGRvQ2xvc2UoKSB7XG4gICAgICAgIGNvbnN0IGNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy53cml0ZShbeyB0eXBlOiBcImNsb3NlXCIgfV0pO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoXCJvcGVuXCIgPT09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgY2xvc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGluIGNhc2Ugd2UncmUgdHJ5aW5nIHRvIGNsb3NlIHdoaWxlXG4gICAgICAgICAgICAvLyBoYW5kc2hha2luZyBpcyBpbiBwcm9ncmVzcyAoR0gtMTY0KVxuICAgICAgICAgICAgdGhpcy5vbmNlKFwib3BlblwiLCBjbG9zZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogV3JpdGVzIGEgcGFja2V0cyBwYXlsb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFja2V0cyAtIGRhdGEgcGFja2V0c1xuICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgKi9cbiAgICB3cml0ZShwYWNrZXRzKSB7XG4gICAgICAgIHRoaXMud3JpdGFibGUgPSBmYWxzZTtcbiAgICAgICAgZW5jb2RlUGF5bG9hZChwYWNrZXRzLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kb1dyaXRlKGRhdGEsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImRyYWluXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgdXJpIGZvciBjb25uZWN0aW9uLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB1cmkoKSB7XG4gICAgICAgIGxldCBxdWVyeSA9IHRoaXMucXVlcnkgfHwge307XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHRoaXMub3B0cy5zZWN1cmUgPyBcImh0dHBzXCIgOiBcImh0dHBcIjtcbiAgICAgICAgbGV0IHBvcnQgPSBcIlwiO1xuICAgICAgICAvLyBjYWNoZSBidXN0aW5nIGlzIGZvcmNlZFxuICAgICAgICBpZiAoZmFsc2UgIT09IHRoaXMub3B0cy50aW1lc3RhbXBSZXF1ZXN0cykge1xuICAgICAgICAgICAgcXVlcnlbdGhpcy5vcHRzLnRpbWVzdGFtcFBhcmFtXSA9IHllYXN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnN1cHBvcnRzQmluYXJ5ICYmICFxdWVyeS5zaWQpIHtcbiAgICAgICAgICAgIHF1ZXJ5LmI2NCA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYXZvaWQgcG9ydCBpZiBkZWZhdWx0IGZvciBzY2hlbWFcbiAgICAgICAgaWYgKHRoaXMub3B0cy5wb3J0ICYmXG4gICAgICAgICAgICAoKFwiaHR0cHNcIiA9PT0gc2NoZW1hICYmIE51bWJlcih0aGlzLm9wdHMucG9ydCkgIT09IDQ0MykgfHxcbiAgICAgICAgICAgICAgICAoXCJodHRwXCIgPT09IHNjaGVtYSAmJiBOdW1iZXIodGhpcy5vcHRzLnBvcnQpICE9PSA4MCkpKSB7XG4gICAgICAgICAgICBwb3J0ID0gXCI6XCIgKyB0aGlzLm9wdHMucG9ydDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbmNvZGVkUXVlcnkgPSBlbmNvZGUocXVlcnkpO1xuICAgICAgICBjb25zdCBpcHY2ID0gdGhpcy5vcHRzLmhvc3RuYW1lLmluZGV4T2YoXCI6XCIpICE9PSAtMTtcbiAgICAgICAgcmV0dXJuIChzY2hlbWEgK1xuICAgICAgICAgICAgXCI6Ly9cIiArXG4gICAgICAgICAgICAoaXB2NiA/IFwiW1wiICsgdGhpcy5vcHRzLmhvc3RuYW1lICsgXCJdXCIgOiB0aGlzLm9wdHMuaG9zdG5hbWUpICtcbiAgICAgICAgICAgIHBvcnQgK1xuICAgICAgICAgICAgdGhpcy5vcHRzLnBhdGggK1xuICAgICAgICAgICAgKGVuY29kZWRRdWVyeS5sZW5ndGggPyBcIj9cIiArIGVuY29kZWRRdWVyeSA6IFwiXCIpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHJlcXVlc3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICByZXF1ZXN0KG9wdHMgPSB7fSkge1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdHMsIHsgeGQ6IHRoaXMueGQsIHhzOiB0aGlzLnhzIH0sIHRoaXMub3B0cyk7XG4gICAgICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLnVyaSgpLCBvcHRzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2VuZHMgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhIHRvIHNlbmQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGVkIHVwb24gZmx1c2guXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBkb1dyaXRlKGRhdGEsIGZuKSB7XG4gICAgICAgIGNvbnN0IHJlcSA9IHRoaXMucmVxdWVzdCh7XG4gICAgICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJlcS5vbihcInN1Y2Nlc3NcIiwgZm4pO1xuICAgICAgICByZXEub24oXCJlcnJvclwiLCAoeGhyU3RhdHVzLCBjb250ZXh0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uRXJyb3IoXCJ4aHIgcG9zdCBlcnJvclwiLCB4aHJTdGF0dXMsIGNvbnRleHQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3RhcnRzIGEgcG9sbCBjeWNsZS5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZG9Qb2xsKCkge1xuICAgICAgICBjb25zdCByZXEgPSB0aGlzLnJlcXVlc3QoKTtcbiAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCB0aGlzLm9uRGF0YS5iaW5kKHRoaXMpKTtcbiAgICAgICAgcmVxLm9uKFwiZXJyb3JcIiwgKHhoclN0YXR1cywgY29udGV4dCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbkVycm9yKFwieGhyIHBvbGwgZXJyb3JcIiwgeGhyU3RhdHVzLCBjb250ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucG9sbFhociA9IHJlcTtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgUmVxdWVzdCBleHRlbmRzIEVtaXR0ZXIge1xuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gICAgICogQHBhY2thZ2VcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih1cmksIG9wdHMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgaW5zdGFsbFRpbWVyRnVuY3Rpb25zKHRoaXMsIG9wdHMpO1xuICAgICAgICB0aGlzLm9wdHMgPSBvcHRzO1xuICAgICAgICB0aGlzLm1ldGhvZCA9IG9wdHMubWV0aG9kIHx8IFwiR0VUXCI7XG4gICAgICAgIHRoaXMudXJpID0gdXJpO1xuICAgICAgICB0aGlzLmFzeW5jID0gZmFsc2UgIT09IG9wdHMuYXN5bmM7XG4gICAgICAgIHRoaXMuZGF0YSA9IHVuZGVmaW5lZCAhPT0gb3B0cy5kYXRhID8gb3B0cy5kYXRhIDogbnVsbDtcbiAgICAgICAgdGhpcy5jcmVhdGUoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgWEhSIG9iamVjdCBhbmQgc2VuZHMgdGhlIHJlcXVlc3QuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGNyZWF0ZSgpIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHBpY2sodGhpcy5vcHRzLCBcImFnZW50XCIsIFwicGZ4XCIsIFwia2V5XCIsIFwicGFzc3BocmFzZVwiLCBcImNlcnRcIiwgXCJjYVwiLCBcImNpcGhlcnNcIiwgXCJyZWplY3RVbmF1dGhvcml6ZWRcIiwgXCJhdXRvVW5yZWZcIik7XG4gICAgICAgIG9wdHMueGRvbWFpbiA9ICEhdGhpcy5vcHRzLnhkO1xuICAgICAgICBvcHRzLnhzY2hlbWUgPSAhIXRoaXMub3B0cy54cztcbiAgICAgICAgY29uc3QgeGhyID0gKHRoaXMueGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KG9wdHMpKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHhoci5vcGVuKHRoaXMubWV0aG9kLCB0aGlzLnVyaSwgdGhpcy5hc3luYyk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuZXh0cmFIZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHhoci5zZXREaXNhYmxlSGVhZGVyQ2hlY2sgJiYgeGhyLnNldERpc2FibGVIZWFkZXJDaGVjayh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSBpbiB0aGlzLm9wdHMuZXh0cmFIZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRzLmV4dHJhSGVhZGVycy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGksIHRoaXMub3B0cy5leHRyYUhlYWRlcnNbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHsgfVxuICAgICAgICAgICAgaWYgKFwiUE9TVFwiID09PSB0aGlzLm1ldGhvZCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC10eXBlXCIsIFwidGV4dC9wbGFpbjtjaGFyc2V0PVVURi04XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkgeyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwiKi8qXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHsgfVxuICAgICAgICAgICAgLy8gaWU2IGNoZWNrXG4gICAgICAgICAgICBpZiAoXCJ3aXRoQ3JlZGVudGlhbHNcIiBpbiB4aHIpIHtcbiAgICAgICAgICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdGhpcy5vcHRzLndpdGhDcmVkZW50aWFscztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMucmVxdWVzdFRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICB4aHIudGltZW91dCA9IHRoaXMub3B0cy5yZXF1ZXN0VGltZW91dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKDQgIT09IHhoci5yZWFkeVN0YXRlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKDIwMCA9PT0geGhyLnN0YXR1cyB8fCAxMjIzID09PSB4aHIuc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25Mb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGBlcnJvcmAgZXZlbnQgaGFuZGxlciB0aGF0J3MgdXNlci1zZXRcbiAgICAgICAgICAgICAgICAgICAgLy8gZG9lcyBub3QgdGhyb3cgaW4gdGhlIHNhbWUgdGljayBhbmQgZ2V0cyBjYXVnaHQgaGVyZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFRpbWVvdXRGbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRXJyb3IodHlwZW9mIHhoci5zdGF0dXMgPT09IFwibnVtYmVyXCIgPyB4aHIuc3RhdHVzIDogMCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB4aHIuc2VuZCh0aGlzLmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBOZWVkIHRvIGRlZmVyIHNpbmNlIC5jcmVhdGUoKSBpcyBjYWxsZWQgZGlyZWN0bHkgZnJvbSB0aGUgY29uc3RydWN0b3JcbiAgICAgICAgICAgIC8vIGFuZCB0aHVzIHRoZSAnZXJyb3InIGV2ZW50IGNhbiBvbmx5IGJlIG9ubHkgYm91bmQgKmFmdGVyKiB0aGlzIGV4Y2VwdGlvblxuICAgICAgICAgICAgLy8gb2NjdXJzLiAgVGhlcmVmb3JlLCBhbHNvLCB3ZSBjYW5ub3QgdGhyb3cgaGVyZSBhdCBhbGwuXG4gICAgICAgICAgICB0aGlzLnNldFRpbWVvdXRGbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkVycm9yKGUpO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy5pbmRleCA9IFJlcXVlc3QucmVxdWVzdHNDb3VudCsrO1xuICAgICAgICAgICAgUmVxdWVzdC5yZXF1ZXN0c1t0aGlzLmluZGV4XSA9IHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gZXJyb3IuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uRXJyb3IoZXJyKSB7XG4gICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwiZXJyb3JcIiwgZXJyLCB0aGlzLnhocik7XG4gICAgICAgIHRoaXMuY2xlYW51cCh0cnVlKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYW5zIHVwIGhvdXNlLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBjbGVhbnVwKGZyb21FcnJvcikge1xuICAgICAgICBpZiAoXCJ1bmRlZmluZWRcIiA9PT0gdHlwZW9mIHRoaXMueGhyIHx8IG51bGwgPT09IHRoaXMueGhyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZW1wdHk7XG4gICAgICAgIGlmIChmcm9tRXJyb3IpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy54aHIuYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICBkZWxldGUgUmVxdWVzdC5yZXF1ZXN0c1t0aGlzLmluZGV4XTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnhociA9IG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIGxvYWQuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uTG9hZCgpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMueGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgaWYgKGRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwiZGF0YVwiLCBkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIHRoaXMuY2xlYW51cCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFib3J0cyB0aGUgcmVxdWVzdC5cbiAgICAgKlxuICAgICAqIEBwYWNrYWdlXG4gICAgICovXG4gICAgYWJvcnQoKSB7XG4gICAgICAgIHRoaXMuY2xlYW51cCgpO1xuICAgIH1cbn1cblJlcXVlc3QucmVxdWVzdHNDb3VudCA9IDA7XG5SZXF1ZXN0LnJlcXVlc3RzID0ge307XG4vKipcbiAqIEFib3J0cyBwZW5kaW5nIHJlcXVlc3RzIHdoZW4gdW5sb2FkaW5nIHRoZSB3aW5kb3cuIFRoaXMgaXMgbmVlZGVkIHRvIHByZXZlbnRcbiAqIG1lbW9yeSBsZWFrcyAoZS5nLiB3aGVuIHVzaW5nIElFKSBhbmQgdG8gZW5zdXJlIHRoYXQgbm8gc3B1cmlvdXMgZXJyb3IgaXNcbiAqIGVtaXR0ZWQuXG4gKi9cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgaWYgKHR5cGVvZiBhdHRhY2hFdmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgYXR0YWNoRXZlbnQoXCJvbnVubG9hZFwiLCB1bmxvYWRIYW5kbGVyKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFkZEV2ZW50TGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBjb25zdCB0ZXJtaW5hdGlvbkV2ZW50ID0gXCJvbnBhZ2VoaWRlXCIgaW4gZ2xvYmFsVGhpcyA/IFwicGFnZWhpZGVcIiA6IFwidW5sb2FkXCI7XG4gICAgICAgIGFkZEV2ZW50TGlzdGVuZXIodGVybWluYXRpb25FdmVudCwgdW5sb2FkSGFuZGxlciwgZmFsc2UpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHVubG9hZEhhbmRsZXIoKSB7XG4gICAgZm9yIChsZXQgaSBpbiBSZXF1ZXN0LnJlcXVlc3RzKSB7XG4gICAgICAgIGlmIChSZXF1ZXN0LnJlcXVlc3RzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICBSZXF1ZXN0LnJlcXVlc3RzW2ldLmFib3J0KCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBnbG9iYWxUaGlzU2hpbSBhcyBnbG9iYWxUaGlzIH0gZnJvbSBcIi4uL2dsb2JhbFRoaXMuanNcIjtcbmV4cG9ydCBjb25zdCBuZXh0VGljayA9ICgoKSA9PiB7XG4gICAgY29uc3QgaXNQcm9taXNlQXZhaWxhYmxlID0gdHlwZW9mIFByb21pc2UgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgUHJvbWlzZS5yZXNvbHZlID09PSBcImZ1bmN0aW9uXCI7XG4gICAgaWYgKGlzUHJvbWlzZUF2YWlsYWJsZSkge1xuICAgICAgICByZXR1cm4gKGNiKSA9PiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGNiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiAoY2IsIHNldFRpbWVvdXRGbikgPT4gc2V0VGltZW91dEZuKGNiLCAwKTtcbiAgICB9XG59KSgpO1xuZXhwb3J0IGNvbnN0IFdlYlNvY2tldCA9IGdsb2JhbFRoaXMuV2ViU29ja2V0IHx8IGdsb2JhbFRoaXMuTW96V2ViU29ja2V0O1xuZXhwb3J0IGNvbnN0IHVzaW5nQnJvd3NlcldlYlNvY2tldCA9IHRydWU7XG5leHBvcnQgY29uc3QgZGVmYXVsdEJpbmFyeVR5cGUgPSBcImFycmF5YnVmZmVyXCI7XG4iLCJpbXBvcnQgeyBUcmFuc3BvcnQgfSBmcm9tIFwiLi4vdHJhbnNwb3J0LmpzXCI7XG5pbXBvcnQgeyBlbmNvZGUgfSBmcm9tIFwiLi4vY29udHJpYi9wYXJzZXFzLmpzXCI7XG5pbXBvcnQgeyB5ZWFzdCB9IGZyb20gXCIuLi9jb250cmliL3llYXN0LmpzXCI7XG5pbXBvcnQgeyBwaWNrIH0gZnJvbSBcIi4uL3V0aWwuanNcIjtcbmltcG9ydCB7IGRlZmF1bHRCaW5hcnlUeXBlLCBuZXh0VGljaywgdXNpbmdCcm93c2VyV2ViU29ja2V0LCBXZWJTb2NrZXQsIH0gZnJvbSBcIi4vd2Vic29ja2V0LWNvbnN0cnVjdG9yLmpzXCI7XG5pbXBvcnQgeyBlbmNvZGVQYWNrZXQgfSBmcm9tIFwiZW5naW5lLmlvLXBhcnNlclwiO1xuLy8gZGV0ZWN0IFJlYWN0TmF0aXZlIGVudmlyb25tZW50XG5jb25zdCBpc1JlYWN0TmF0aXZlID0gdHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgIHR5cGVvZiBuYXZpZ2F0b3IucHJvZHVjdCA9PT0gXCJzdHJpbmdcIiAmJlxuICAgIG5hdmlnYXRvci5wcm9kdWN0LnRvTG93ZXJDYXNlKCkgPT09IFwicmVhY3RuYXRpdmVcIjtcbmV4cG9ydCBjbGFzcyBXUyBleHRlbmRzIFRyYW5zcG9ydCB7XG4gICAgLyoqXG4gICAgICogV2ViU29ja2V0IHRyYW5zcG9ydCBjb25zdHJ1Y3Rvci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIC0gY29ubmVjdGlvbiBvcHRpb25zXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG4gICAgICAgIHRoaXMuc3VwcG9ydHNCaW5hcnkgPSAhb3B0cy5mb3JjZUJhc2U2NDtcbiAgICB9XG4gICAgZ2V0IG5hbWUoKSB7XG4gICAgICAgIHJldHVybiBcIndlYnNvY2tldFwiO1xuICAgIH1cbiAgICBkb09wZW4oKSB7XG4gICAgICAgIGlmICghdGhpcy5jaGVjaygpKSB7XG4gICAgICAgICAgICAvLyBsZXQgcHJvYmUgdGltZW91dFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVyaSA9IHRoaXMudXJpKCk7XG4gICAgICAgIGNvbnN0IHByb3RvY29scyA9IHRoaXMub3B0cy5wcm90b2NvbHM7XG4gICAgICAgIC8vIFJlYWN0IE5hdGl2ZSBvbmx5IHN1cHBvcnRzIHRoZSAnaGVhZGVycycgb3B0aW9uLCBhbmQgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgYW55dGhpbmcgZWxzZSBpcyBwYXNzZWRcbiAgICAgICAgY29uc3Qgb3B0cyA9IGlzUmVhY3ROYXRpdmVcbiAgICAgICAgICAgID8ge31cbiAgICAgICAgICAgIDogcGljayh0aGlzLm9wdHMsIFwiYWdlbnRcIiwgXCJwZXJNZXNzYWdlRGVmbGF0ZVwiLCBcInBmeFwiLCBcImtleVwiLCBcInBhc3NwaHJhc2VcIiwgXCJjZXJ0XCIsIFwiY2FcIiwgXCJjaXBoZXJzXCIsIFwicmVqZWN0VW5hdXRob3JpemVkXCIsIFwibG9jYWxBZGRyZXNzXCIsIFwicHJvdG9jb2xWZXJzaW9uXCIsIFwib3JpZ2luXCIsIFwibWF4UGF5bG9hZFwiLCBcImZhbWlseVwiLCBcImNoZWNrU2VydmVySWRlbnRpdHlcIik7XG4gICAgICAgIGlmICh0aGlzLm9wdHMuZXh0cmFIZWFkZXJzKSB7XG4gICAgICAgICAgICBvcHRzLmhlYWRlcnMgPSB0aGlzLm9wdHMuZXh0cmFIZWFkZXJzO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLndzID1cbiAgICAgICAgICAgICAgICB1c2luZ0Jyb3dzZXJXZWJTb2NrZXQgJiYgIWlzUmVhY3ROYXRpdmVcbiAgICAgICAgICAgICAgICAgICAgPyBwcm90b2NvbHNcbiAgICAgICAgICAgICAgICAgICAgICAgID8gbmV3IFdlYlNvY2tldCh1cmksIHByb3RvY29scylcbiAgICAgICAgICAgICAgICAgICAgICAgIDogbmV3IFdlYlNvY2tldCh1cmkpXG4gICAgICAgICAgICAgICAgICAgIDogbmV3IFdlYlNvY2tldCh1cmksIHByb3RvY29scywgb3B0cyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW1pdFJlc2VydmVkKFwiZXJyb3JcIiwgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLndzLmJpbmFyeVR5cGUgPSB0aGlzLnNvY2tldC5iaW5hcnlUeXBlIHx8IGRlZmF1bHRCaW5hcnlUeXBlO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBzb2NrZXRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XG4gICAgICAgIHRoaXMud3Mub25vcGVuID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5hdXRvVW5yZWYpIHtcbiAgICAgICAgICAgICAgICB0aGlzLndzLl9zb2NrZXQudW5yZWYoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMud3Mub25jbG9zZSA9IChjbG9zZUV2ZW50KSA9PiB0aGlzLm9uQ2xvc2Uoe1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwid2Vic29ja2V0IGNvbm5lY3Rpb24gY2xvc2VkXCIsXG4gICAgICAgICAgICBjb250ZXh0OiBjbG9zZUV2ZW50LFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy53cy5vbm1lc3NhZ2UgPSAoZXYpID0+IHRoaXMub25EYXRhKGV2LmRhdGEpO1xuICAgICAgICB0aGlzLndzLm9uZXJyb3IgPSAoZSkgPT4gdGhpcy5vbkVycm9yKFwid2Vic29ja2V0IGVycm9yXCIsIGUpO1xuICAgIH1cbiAgICB3cml0ZShwYWNrZXRzKSB7XG4gICAgICAgIHRoaXMud3JpdGFibGUgPSBmYWxzZTtcbiAgICAgICAgLy8gZW5jb2RlUGFja2V0IGVmZmljaWVudCBhcyBpdCB1c2VzIFdTIGZyYW1pbmdcbiAgICAgICAgLy8gbm8gbmVlZCBmb3IgZW5jb2RlUGF5bG9hZFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhY2tldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldCA9IHBhY2tldHNbaV07XG4gICAgICAgICAgICBjb25zdCBsYXN0UGFja2V0ID0gaSA9PT0gcGFja2V0cy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgZW5jb2RlUGFja2V0KHBhY2tldCwgdGhpcy5zdXBwb3J0c0JpbmFyeSwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBhbHdheXMgY3JlYXRlIGEgbmV3IG9iamVjdCAoR0gtNDM3KVxuICAgICAgICAgICAgICAgIGNvbnN0IG9wdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAoIXVzaW5nQnJvd3NlcldlYlNvY2tldCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFja2V0Lm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdHMuY29tcHJlc3MgPSBwYWNrZXQub3B0aW9ucy5jb21wcmVzcztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRzLnBlck1lc3NhZ2VEZWZsYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic3RyaW5nXCIgPT09IHR5cGVvZiBkYXRhID8gQnVmZmVyLmJ5dGVMZW5ndGgoZGF0YSkgOiBkYXRhLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsZW4gPCB0aGlzLm9wdHMucGVyTWVzc2FnZURlZmxhdGUudGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0cy5jb21wcmVzcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNvbWV0aW1lcyB0aGUgd2Vic29ja2V0IGhhcyBhbHJlYWR5IGJlZW4gY2xvc2VkIGJ1dCB0aGUgYnJvd3NlciBkaWRuJ3RcbiAgICAgICAgICAgICAgICAvLyBoYXZlIGEgY2hhbmNlIG9mIGluZm9ybWluZyB1cyBhYm91dCBpdCB5ZXQsIGluIHRoYXQgY2FzZSBzZW5kIHdpbGxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdyBhbiBlcnJvclxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1c2luZ0Jyb3dzZXJXZWJTb2NrZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFR5cGVFcnJvciBpcyB0aHJvd24gd2hlbiBwYXNzaW5nIHRoZSBzZWNvbmQgYXJndW1lbnQgb24gU2FmYXJpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndzLnNlbmQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndzLnNlbmQoZGF0YSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RQYWNrZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZmFrZSBkcmFpblxuICAgICAgICAgICAgICAgICAgICAvLyBkZWZlciB0byBuZXh0IHRpY2sgdG8gYWxsb3cgU29ja2V0IHRvIGNsZWFyIHdyaXRlQnVmZmVyXG4gICAgICAgICAgICAgICAgICAgIG5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGFibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJkcmFpblwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgdGhpcy5zZXRUaW1lb3V0Rm4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRvQ2xvc2UoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy53cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy53cy5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy53cyA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIHVyaSBmb3IgY29ubmVjdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdXJpKCkge1xuICAgICAgICBsZXQgcXVlcnkgPSB0aGlzLnF1ZXJ5IHx8IHt9O1xuICAgICAgICBjb25zdCBzY2hlbWEgPSB0aGlzLm9wdHMuc2VjdXJlID8gXCJ3c3NcIiA6IFwid3NcIjtcbiAgICAgICAgbGV0IHBvcnQgPSBcIlwiO1xuICAgICAgICAvLyBhdm9pZCBwb3J0IGlmIGRlZmF1bHQgZm9yIHNjaGVtYVxuICAgICAgICBpZiAodGhpcy5vcHRzLnBvcnQgJiZcbiAgICAgICAgICAgICgoXCJ3c3NcIiA9PT0gc2NoZW1hICYmIE51bWJlcih0aGlzLm9wdHMucG9ydCkgIT09IDQ0MykgfHxcbiAgICAgICAgICAgICAgICAoXCJ3c1wiID09PSBzY2hlbWEgJiYgTnVtYmVyKHRoaXMub3B0cy5wb3J0KSAhPT0gODApKSkge1xuICAgICAgICAgICAgcG9ydCA9IFwiOlwiICsgdGhpcy5vcHRzLnBvcnQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYXBwZW5kIHRpbWVzdGFtcCB0byBVUklcbiAgICAgICAgaWYgKHRoaXMub3B0cy50aW1lc3RhbXBSZXF1ZXN0cykge1xuICAgICAgICAgICAgcXVlcnlbdGhpcy5vcHRzLnRpbWVzdGFtcFBhcmFtXSA9IHllYXN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29tbXVuaWNhdGUgYmluYXJ5IHN1cHBvcnQgY2FwYWJpbGl0aWVzXG4gICAgICAgIGlmICghdGhpcy5zdXBwb3J0c0JpbmFyeSkge1xuICAgICAgICAgICAgcXVlcnkuYjY0ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbmNvZGVkUXVlcnkgPSBlbmNvZGUocXVlcnkpO1xuICAgICAgICBjb25zdCBpcHY2ID0gdGhpcy5vcHRzLmhvc3RuYW1lLmluZGV4T2YoXCI6XCIpICE9PSAtMTtcbiAgICAgICAgcmV0dXJuIChzY2hlbWEgK1xuICAgICAgICAgICAgXCI6Ly9cIiArXG4gICAgICAgICAgICAoaXB2NiA/IFwiW1wiICsgdGhpcy5vcHRzLmhvc3RuYW1lICsgXCJdXCIgOiB0aGlzLm9wdHMuaG9zdG5hbWUpICtcbiAgICAgICAgICAgIHBvcnQgK1xuICAgICAgICAgICAgdGhpcy5vcHRzLnBhdGggK1xuICAgICAgICAgICAgKGVuY29kZWRRdWVyeS5sZW5ndGggPyBcIj9cIiArIGVuY29kZWRRdWVyeSA6IFwiXCIpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRmVhdHVyZSBkZXRlY3Rpb24gZm9yIFdlYlNvY2tldC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgdGhpcyB0cmFuc3BvcnQgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgY2hlY2soKSB7XG4gICAgICAgIHJldHVybiAhIVdlYlNvY2tldDtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBQb2xsaW5nIH0gZnJvbSBcIi4vcG9sbGluZy5qc1wiO1xuaW1wb3J0IHsgV1MgfSBmcm9tIFwiLi93ZWJzb2NrZXQuanNcIjtcbmV4cG9ydCBjb25zdCB0cmFuc3BvcnRzID0ge1xuICAgIHdlYnNvY2tldDogV1MsXG4gICAgcG9sbGluZzogUG9sbGluZyxcbn07XG4iLCIvLyBpbXBvcnRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9nYWxrbi9wYXJzZXVyaVxuLyoqXG4gKiBQYXJzZXMgYSBVUklcbiAqXG4gKiBOb3RlOiB3ZSBjb3VsZCBhbHNvIGhhdmUgdXNlZCB0aGUgYnVpbHQtaW4gVVJMIG9iamVjdCwgYnV0IGl0IGlzbid0IHN1cHBvcnRlZCBvbiBhbGwgcGxhdGZvcm1zLlxuICpcbiAqIFNlZTpcbiAqIC0gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1VSTFxuICogLSBodHRwczovL2Nhbml1c2UuY29tL3VybFxuICogLSBodHRwczovL3d3dy5yZmMtZWRpdG9yLm9yZy9yZmMvcmZjMzk4NiNhcHBlbmRpeC1CXG4gKlxuICogSGlzdG9yeSBvZiB0aGUgcGFyc2UoKSBtZXRob2Q6XG4gKiAtIGZpcnN0IGNvbW1pdDogaHR0cHM6Ly9naXRodWIuY29tL3NvY2tldGlvL3NvY2tldC5pby1jbGllbnQvY29tbWl0LzRlZTFkNWQ5NGIzOTA2YTljMDUyYjQ1OWYxYTgxOGIxNWYzOGY5MWNcbiAqIC0gZXhwb3J0IGludG8gaXRzIG93biBtb2R1bGU6IGh0dHBzOi8vZ2l0aHViLmNvbS9zb2NrZXRpby9lbmdpbmUuaW8tY2xpZW50L2NvbW1pdC9kZTJjNTYxZTQ1NjRlZmViNzhmMWJkYjFiYTM5ZWY4MWIyODIyY2IzXG4gKiAtIHJlaW1wb3J0OiBodHRwczovL2dpdGh1Yi5jb20vc29ja2V0aW8vZW5naW5lLmlvLWNsaWVudC9jb21taXQvZGYzMjI3N2MzZjZkNjIyZWVjNWVkMDlmNDkzY2FlM2YzMzkxZDI0MlxuICpcbiAqIEBhdXRob3IgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+IChNSVQgbGljZW5zZSlcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5jb25zdCByZSA9IC9eKD86KD8hW146QFxcLz8jXSs6W146QFxcL10qQCkoaHR0cHxodHRwc3x3c3x3c3MpOlxcL1xcLyk/KCg/OigoW146QFxcLz8jXSopKD86OihbXjpAXFwvPyNdKikpPyk/QCk/KCg/OlthLWYwLTldezAsNH06KXsyLDd9W2EtZjAtOV17MCw0fXxbXjpcXC8/I10qKSg/OjooXFxkKikpPykoKChcXC8oPzpbXj8jXSg/IVtePyNcXC9dKlxcLltePyNcXC8uXSsoPzpbPyNdfCQpKSkqXFwvPyk/KFtePyNcXC9dKikpKD86XFw/KFteI10qKSk/KD86IyguKikpPykvO1xuY29uc3QgcGFydHMgPSBbXG4gICAgJ3NvdXJjZScsICdwcm90b2NvbCcsICdhdXRob3JpdHknLCAndXNlckluZm8nLCAndXNlcicsICdwYXNzd29yZCcsICdob3N0JywgJ3BvcnQnLCAncmVsYXRpdmUnLCAncGF0aCcsICdkaXJlY3RvcnknLCAnZmlsZScsICdxdWVyeScsICdhbmNob3InXG5dO1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICAgIGNvbnN0IHNyYyA9IHN0ciwgYiA9IHN0ci5pbmRleE9mKCdbJyksIGUgPSBzdHIuaW5kZXhPZignXScpO1xuICAgIGlmIChiICE9IC0xICYmIGUgIT0gLTEpIHtcbiAgICAgICAgc3RyID0gc3RyLnN1YnN0cmluZygwLCBiKSArIHN0ci5zdWJzdHJpbmcoYiwgZSkucmVwbGFjZSgvOi9nLCAnOycpICsgc3RyLnN1YnN0cmluZyhlLCBzdHIubGVuZ3RoKTtcbiAgICB9XG4gICAgbGV0IG0gPSByZS5leGVjKHN0ciB8fCAnJyksIHVyaSA9IHt9LCBpID0gMTQ7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB1cmlbcGFydHNbaV1dID0gbVtpXSB8fCAnJztcbiAgICB9XG4gICAgaWYgKGIgIT0gLTEgJiYgZSAhPSAtMSkge1xuICAgICAgICB1cmkuc291cmNlID0gc3JjO1xuICAgICAgICB1cmkuaG9zdCA9IHVyaS5ob3N0LnN1YnN0cmluZygxLCB1cmkuaG9zdC5sZW5ndGggLSAxKS5yZXBsYWNlKC87L2csICc6Jyk7XG4gICAgICAgIHVyaS5hdXRob3JpdHkgPSB1cmkuYXV0aG9yaXR5LnJlcGxhY2UoJ1snLCAnJykucmVwbGFjZSgnXScsICcnKS5yZXBsYWNlKC87L2csICc6Jyk7XG4gICAgICAgIHVyaS5pcHY2dXJpID0gdHJ1ZTtcbiAgICB9XG4gICAgdXJpLnBhdGhOYW1lcyA9IHBhdGhOYW1lcyh1cmksIHVyaVsncGF0aCddKTtcbiAgICB1cmkucXVlcnlLZXkgPSBxdWVyeUtleSh1cmksIHVyaVsncXVlcnknXSk7XG4gICAgcmV0dXJuIHVyaTtcbn1cbmZ1bmN0aW9uIHBhdGhOYW1lcyhvYmosIHBhdGgpIHtcbiAgICBjb25zdCByZWd4ID0gL1xcL3syLDl9L2csIG5hbWVzID0gcGF0aC5yZXBsYWNlKHJlZ3gsIFwiL1wiKS5zcGxpdChcIi9cIik7XG4gICAgaWYgKHBhdGguc2xpY2UoMCwgMSkgPT0gJy8nIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIG5hbWVzLnNwbGljZSgwLCAxKTtcbiAgICB9XG4gICAgaWYgKHBhdGguc2xpY2UoLTEpID09ICcvJykge1xuICAgICAgICBuYW1lcy5zcGxpY2UobmFtZXMubGVuZ3RoIC0gMSwgMSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcztcbn1cbmZ1bmN0aW9uIHF1ZXJ5S2V5KHVyaSwgcXVlcnkpIHtcbiAgICBjb25zdCBkYXRhID0ge307XG4gICAgcXVlcnkucmVwbGFjZSgvKD86XnwmKShbXiY9XSopPT8oW14mXSopL2csIGZ1bmN0aW9uICgkMCwgJDEsICQyKSB7XG4gICAgICAgIGlmICgkMSkge1xuICAgICAgICAgICAgZGF0YVskMV0gPSAkMjtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkYXRhO1xufVxuIiwiaW1wb3J0IHsgdHJhbnNwb3J0cyB9IGZyb20gXCIuL3RyYW5zcG9ydHMvaW5kZXguanNcIjtcbmltcG9ydCB7IGluc3RhbGxUaW1lckZ1bmN0aW9ucywgYnl0ZUxlbmd0aCB9IGZyb20gXCIuL3V0aWwuanNcIjtcbmltcG9ydCB7IGRlY29kZSB9IGZyb20gXCIuL2NvbnRyaWIvcGFyc2Vxcy5qc1wiO1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tIFwiLi9jb250cmliL3BhcnNldXJpLmpzXCI7XG5pbXBvcnQgeyBFbWl0dGVyIH0gZnJvbSBcIkBzb2NrZXQuaW8vY29tcG9uZW50LWVtaXR0ZXJcIjtcbmltcG9ydCB7IHByb3RvY29sIH0gZnJvbSBcImVuZ2luZS5pby1wYXJzZXJcIjtcbmV4cG9ydCBjbGFzcyBTb2NrZXQgZXh0ZW5kcyBFbWl0dGVyIHtcbiAgICAvKipcbiAgICAgKiBTb2NrZXQgY29uc3RydWN0b3IuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHVyaSAtIHVyaSBvciBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgLSBvcHRpb25zXG4gICAgICovXG4gICAgY29uc3RydWN0b3IodXJpLCBvcHRzID0ge30pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy53cml0ZUJ1ZmZlciA9IFtdO1xuICAgICAgICBpZiAodXJpICYmIFwib2JqZWN0XCIgPT09IHR5cGVvZiB1cmkpIHtcbiAgICAgICAgICAgIG9wdHMgPSB1cmk7XG4gICAgICAgICAgICB1cmkgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cmkpIHtcbiAgICAgICAgICAgIHVyaSA9IHBhcnNlKHVyaSk7XG4gICAgICAgICAgICBvcHRzLmhvc3RuYW1lID0gdXJpLmhvc3Q7XG4gICAgICAgICAgICBvcHRzLnNlY3VyZSA9IHVyaS5wcm90b2NvbCA9PT0gXCJodHRwc1wiIHx8IHVyaS5wcm90b2NvbCA9PT0gXCJ3c3NcIjtcbiAgICAgICAgICAgIG9wdHMucG9ydCA9IHVyaS5wb3J0O1xuICAgICAgICAgICAgaWYgKHVyaS5xdWVyeSlcbiAgICAgICAgICAgICAgICBvcHRzLnF1ZXJ5ID0gdXJpLnF1ZXJ5O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG9wdHMuaG9zdCkge1xuICAgICAgICAgICAgb3B0cy5ob3N0bmFtZSA9IHBhcnNlKG9wdHMuaG9zdCkuaG9zdDtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YWxsVGltZXJGdW5jdGlvbnModGhpcywgb3B0cyk7XG4gICAgICAgIHRoaXMuc2VjdXJlID1cbiAgICAgICAgICAgIG51bGwgIT0gb3B0cy5zZWN1cmVcbiAgICAgICAgICAgICAgICA/IG9wdHMuc2VjdXJlXG4gICAgICAgICAgICAgICAgOiB0eXBlb2YgbG9jYXRpb24gIT09IFwidW5kZWZpbmVkXCIgJiYgXCJodHRwczpcIiA9PT0gbG9jYXRpb24ucHJvdG9jb2w7XG4gICAgICAgIGlmIChvcHRzLmhvc3RuYW1lICYmICFvcHRzLnBvcnQpIHtcbiAgICAgICAgICAgIC8vIGlmIG5vIHBvcnQgaXMgc3BlY2lmaWVkIG1hbnVhbGx5LCB1c2UgdGhlIHByb3RvY29sIGRlZmF1bHRcbiAgICAgICAgICAgIG9wdHMucG9ydCA9IHRoaXMuc2VjdXJlID8gXCI0NDNcIiA6IFwiODBcIjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhvc3RuYW1lID1cbiAgICAgICAgICAgIG9wdHMuaG9zdG5hbWUgfHxcbiAgICAgICAgICAgICAgICAodHlwZW9mIGxvY2F0aW9uICE9PSBcInVuZGVmaW5lZFwiID8gbG9jYXRpb24uaG9zdG5hbWUgOiBcImxvY2FsaG9zdFwiKTtcbiAgICAgICAgdGhpcy5wb3J0ID1cbiAgICAgICAgICAgIG9wdHMucG9ydCB8fFxuICAgICAgICAgICAgICAgICh0eXBlb2YgbG9jYXRpb24gIT09IFwidW5kZWZpbmVkXCIgJiYgbG9jYXRpb24ucG9ydFxuICAgICAgICAgICAgICAgICAgICA/IGxvY2F0aW9uLnBvcnRcbiAgICAgICAgICAgICAgICAgICAgOiB0aGlzLnNlY3VyZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBcIjQ0M1wiXG4gICAgICAgICAgICAgICAgICAgICAgICA6IFwiODBcIik7XG4gICAgICAgIHRoaXMudHJhbnNwb3J0cyA9IG9wdHMudHJhbnNwb3J0cyB8fCBbXCJwb2xsaW5nXCIsIFwid2Vic29ja2V0XCJdO1xuICAgICAgICB0aGlzLndyaXRlQnVmZmVyID0gW107XG4gICAgICAgIHRoaXMucHJldkJ1ZmZlckxlbiA9IDA7XG4gICAgICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgcGF0aDogXCIvZW5naW5lLmlvXCIsXG4gICAgICAgICAgICBhZ2VudDogZmFsc2UsXG4gICAgICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlLFxuICAgICAgICAgICAgdXBncmFkZTogdHJ1ZSxcbiAgICAgICAgICAgIHRpbWVzdGFtcFBhcmFtOiBcInRcIixcbiAgICAgICAgICAgIHJlbWVtYmVyVXBncmFkZTogZmFsc2UsXG4gICAgICAgICAgICBhZGRUcmFpbGluZ1NsYXNoOiB0cnVlLFxuICAgICAgICAgICAgcmVqZWN0VW5hdXRob3JpemVkOiB0cnVlLFxuICAgICAgICAgICAgcGVyTWVzc2FnZURlZmxhdGU6IHtcbiAgICAgICAgICAgICAgICB0aHJlc2hvbGQ6IDEwMjQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdHJhbnNwb3J0T3B0aW9uczoge30sXG4gICAgICAgICAgICBjbG9zZU9uQmVmb3JldW5sb2FkOiB0cnVlLFxuICAgICAgICB9LCBvcHRzKTtcbiAgICAgICAgdGhpcy5vcHRzLnBhdGggPVxuICAgICAgICAgICAgdGhpcy5vcHRzLnBhdGgucmVwbGFjZSgvXFwvJC8sIFwiXCIpICtcbiAgICAgICAgICAgICAgICAodGhpcy5vcHRzLmFkZFRyYWlsaW5nU2xhc2ggPyBcIi9cIiA6IFwiXCIpO1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMub3B0cy5xdWVyeSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdGhpcy5vcHRzLnF1ZXJ5ID0gZGVjb2RlKHRoaXMub3B0cy5xdWVyeSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2V0IG9uIGhhbmRzaGFrZVxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51cGdyYWRlcyA9IG51bGw7XG4gICAgICAgIHRoaXMucGluZ0ludGVydmFsID0gbnVsbDtcbiAgICAgICAgdGhpcy5waW5nVGltZW91dCA9IG51bGw7XG4gICAgICAgIC8vIHNldCBvbiBoZWFydGJlYXRcbiAgICAgICAgdGhpcy5waW5nVGltZW91dFRpbWVyID0gbnVsbDtcbiAgICAgICAgaWYgKHR5cGVvZiBhZGRFdmVudExpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuY2xvc2VPbkJlZm9yZXVubG9hZCkge1xuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggY2xvc2VzIHRoZSBjb25uZWN0aW9uIHdoZW4gdGhlIFwiYmVmb3JldW5sb2FkXCIgZXZlbnQgaXMgZW1pdHRlZCBidXQgbm90IENocm9tZS4gVGhpcyBldmVudCBsaXN0ZW5lclxuICAgICAgICAgICAgICAgIC8vIGVuc3VyZXMgZXZlcnkgYnJvd3NlciBiZWhhdmVzIHRoZSBzYW1lIChubyBcImRpc2Nvbm5lY3RcIiBldmVudCBhdCB0aGUgU29ja2V0LklPIGxldmVsIHdoZW4gdGhlIHBhZ2UgaXNcbiAgICAgICAgICAgICAgICAvLyBjbG9zZWQvcmVsb2FkZWQpXG4gICAgICAgICAgICAgICAgdGhpcy5iZWZvcmV1bmxvYWRFdmVudExpc3RlbmVyID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cmFuc3BvcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbGVudGx5IGNsb3NlIHRoZSB0cmFuc3BvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0LnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCB0aGlzLmJlZm9yZXVubG9hZEV2ZW50TGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmhvc3RuYW1lICE9PSBcImxvY2FsaG9zdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmZsaW5lRXZlbnRMaXN0ZW5lciA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNsb3NlKFwidHJhbnNwb3J0IGNsb3NlXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIm5ldHdvcmsgY29ubmVjdGlvbiBsb3N0XCIsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcihcIm9mZmxpbmVcIiwgdGhpcy5vZmZsaW5lRXZlbnRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRyYW5zcG9ydCBvZiB0aGUgZ2l2ZW4gdHlwZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIC0gdHJhbnNwb3J0IG5hbWVcbiAgICAgKiBAcmV0dXJuIHtUcmFuc3BvcnR9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBjcmVhdGVUcmFuc3BvcnQobmFtZSkge1xuICAgICAgICBjb25zdCBxdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMub3B0cy5xdWVyeSk7XG4gICAgICAgIC8vIGFwcGVuZCBlbmdpbmUuaW8gcHJvdG9jb2wgaWRlbnRpZmllclxuICAgICAgICBxdWVyeS5FSU8gPSBwcm90b2NvbDtcbiAgICAgICAgLy8gdHJhbnNwb3J0IG5hbWVcbiAgICAgICAgcXVlcnkudHJhbnNwb3J0ID0gbmFtZTtcbiAgICAgICAgLy8gc2Vzc2lvbiBpZCBpZiB3ZSBhbHJlYWR5IGhhdmUgb25lXG4gICAgICAgIGlmICh0aGlzLmlkKVxuICAgICAgICAgICAgcXVlcnkuc2lkID0gdGhpcy5pZDtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMub3B0cy50cmFuc3BvcnRPcHRpb25zW25hbWVdLCB0aGlzLm9wdHMsIHtcbiAgICAgICAgICAgIHF1ZXJ5LFxuICAgICAgICAgICAgc29ja2V0OiB0aGlzLFxuICAgICAgICAgICAgaG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG4gICAgICAgICAgICBzZWN1cmU6IHRoaXMuc2VjdXJlLFxuICAgICAgICAgICAgcG9ydDogdGhpcy5wb3J0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyB0cmFuc3BvcnRzW25hbWVdKG9wdHMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0cmFuc3BvcnQgdG8gdXNlIGFuZCBzdGFydHMgcHJvYmUuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9wZW4oKSB7XG4gICAgICAgIGxldCB0cmFuc3BvcnQ7XG4gICAgICAgIGlmICh0aGlzLm9wdHMucmVtZW1iZXJVcGdyYWRlICYmXG4gICAgICAgICAgICBTb2NrZXQucHJpb3JXZWJzb2NrZXRTdWNjZXNzICYmXG4gICAgICAgICAgICB0aGlzLnRyYW5zcG9ydHMuaW5kZXhPZihcIndlYnNvY2tldFwiKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydCA9IFwid2Vic29ja2V0XCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoMCA9PT0gdGhpcy50cmFuc3BvcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gRW1pdCBlcnJvciBvbiBuZXh0IHRpY2sgc28gaXQgY2FuIGJlIGxpc3RlbmVkIHRvXG4gICAgICAgICAgICB0aGlzLnNldFRpbWVvdXRGbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJlcnJvclwiLCBcIk5vIHRyYW5zcG9ydHMgYXZhaWxhYmxlXCIpO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0cmFuc3BvcnQgPSB0aGlzLnRyYW5zcG9ydHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gXCJvcGVuaW5nXCI7XG4gICAgICAgIC8vIFJldHJ5IHdpdGggdGhlIG5leHQgdHJhbnNwb3J0IGlmIHRoZSB0cmFuc3BvcnQgaXMgZGlzYWJsZWQgKGpzb25wOiBmYWxzZSlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRyYW5zcG9ydCA9IHRoaXMuY3JlYXRlVHJhbnNwb3J0KHRyYW5zcG9ydCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0cy5zaGlmdCgpO1xuICAgICAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdHJhbnNwb3J0Lm9wZW4oKTtcbiAgICAgICAgdGhpcy5zZXRUcmFuc3BvcnQodHJhbnNwb3J0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCB0cmFuc3BvcnQuIERpc2FibGVzIHRoZSBleGlzdGluZyBvbmUgKGlmIGFueSkuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHNldFRyYW5zcG9ydCh0cmFuc3BvcnQpIHtcbiAgICAgICAgaWYgKHRoaXMudHJhbnNwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLnRyYW5zcG9ydC5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZXQgdXAgdHJhbnNwb3J0XG4gICAgICAgIHRoaXMudHJhbnNwb3J0ID0gdHJhbnNwb3J0O1xuICAgICAgICAvLyBzZXQgdXAgdHJhbnNwb3J0IGxpc3RlbmVyc1xuICAgICAgICB0cmFuc3BvcnRcbiAgICAgICAgICAgIC5vbihcImRyYWluXCIsIHRoaXMub25EcmFpbi5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgLm9uKFwicGFja2V0XCIsIHRoaXMub25QYWNrZXQuYmluZCh0aGlzKSlcbiAgICAgICAgICAgIC5vbihcImVycm9yXCIsIHRoaXMub25FcnJvci5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgLm9uKFwiY2xvc2VcIiwgKHJlYXNvbikgPT4gdGhpcy5vbkNsb3NlKFwidHJhbnNwb3J0IGNsb3NlXCIsIHJlYXNvbikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9iZXMgYSB0cmFuc3BvcnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIHRyYW5zcG9ydCBuYW1lXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBwcm9iZShuYW1lKSB7XG4gICAgICAgIGxldCB0cmFuc3BvcnQgPSB0aGlzLmNyZWF0ZVRyYW5zcG9ydChuYW1lKTtcbiAgICAgICAgbGV0IGZhaWxlZCA9IGZhbHNlO1xuICAgICAgICBTb2NrZXQucHJpb3JXZWJzb2NrZXRTdWNjZXNzID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IG9uVHJhbnNwb3J0T3BlbiA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChmYWlsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdHJhbnNwb3J0LnNlbmQoW3sgdHlwZTogXCJwaW5nXCIsIGRhdGE6IFwicHJvYmVcIiB9XSk7XG4gICAgICAgICAgICB0cmFuc3BvcnQub25jZShcInBhY2tldFwiLCAobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZhaWxlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmIChcInBvbmdcIiA9PT0gbXNnLnR5cGUgJiYgXCJwcm9iZVwiID09PSBtc2cuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZ3JhZGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwidXBncmFkaW5nXCIsIHRyYW5zcG9ydCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdHJhbnNwb3J0KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICBTb2NrZXQucHJpb3JXZWJzb2NrZXRTdWNjZXNzID0gXCJ3ZWJzb2NrZXRcIiA9PT0gdHJhbnNwb3J0Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0LnBhdXNlKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWlsZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFwiY2xvc2VkXCIgPT09IHRoaXMucmVhZHlTdGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFRyYW5zcG9ydCh0cmFuc3BvcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNwb3J0LnNlbmQoW3sgdHlwZTogXCJ1cGdyYWRlXCIgfV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJ1cGdyYWRlXCIsIHRyYW5zcG9ydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc3BvcnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGdyYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmx1c2goKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IoXCJwcm9iZSBlcnJvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICBlcnIudHJhbnNwb3J0ID0gdHJhbnNwb3J0Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwidXBncmFkZUVycm9yXCIsIGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGZ1bmN0aW9uIGZyZWV6ZVRyYW5zcG9ydCgpIHtcbiAgICAgICAgICAgIGlmIChmYWlsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgLy8gQW55IGNhbGxiYWNrIGNhbGxlZCBieSB0cmFuc3BvcnQgc2hvdWxkIGJlIGlnbm9yZWQgc2luY2Ugbm93XG4gICAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgdHJhbnNwb3J0LmNsb3NlKCk7XG4gICAgICAgICAgICB0cmFuc3BvcnQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIC8vIEhhbmRsZSBhbnkgZXJyb3IgdGhhdCBoYXBwZW5zIHdoaWxlIHByb2JpbmdcbiAgICAgICAgY29uc3Qgb25lcnJvciA9IChlcnIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFwicHJvYmUgZXJyb3I6IFwiICsgZXJyKTtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIGVycm9yLnRyYW5zcG9ydCA9IHRyYW5zcG9ydC5uYW1lO1xuICAgICAgICAgICAgZnJlZXplVHJhbnNwb3J0KCk7XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcInVwZ3JhZGVFcnJvclwiLCBlcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIGZ1bmN0aW9uIG9uVHJhbnNwb3J0Q2xvc2UoKSB7XG4gICAgICAgICAgICBvbmVycm9yKFwidHJhbnNwb3J0IGNsb3NlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXaGVuIHRoZSBzb2NrZXQgaXMgY2xvc2VkIHdoaWxlIHdlJ3JlIHByb2JpbmdcbiAgICAgICAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICAgICAgICAgIG9uZXJyb3IoXCJzb2NrZXQgY2xvc2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdoZW4gdGhlIHNvY2tldCBpcyB1cGdyYWRlZCB3aGlsZSB3ZSdyZSBwcm9iaW5nXG4gICAgICAgIGZ1bmN0aW9uIG9udXBncmFkZSh0bykge1xuICAgICAgICAgICAgaWYgKHRyYW5zcG9ydCAmJiB0by5uYW1lICE9PSB0cmFuc3BvcnQubmFtZSkge1xuICAgICAgICAgICAgICAgIGZyZWV6ZVRyYW5zcG9ydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFJlbW92ZSBhbGwgbGlzdGVuZXJzIG9uIHRoZSB0cmFuc3BvcnQgYW5kIG9uIHNlbGZcbiAgICAgICAgY29uc3QgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5yZW1vdmVMaXN0ZW5lcihcIm9wZW5cIiwgb25UcmFuc3BvcnRPcGVuKTtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5yZW1vdmVMaXN0ZW5lcihcImVycm9yXCIsIG9uZXJyb3IpO1xuICAgICAgICAgICAgdHJhbnNwb3J0LnJlbW92ZUxpc3RlbmVyKFwiY2xvc2VcIiwgb25UcmFuc3BvcnRDbG9zZSk7XG4gICAgICAgICAgICB0aGlzLm9mZihcImNsb3NlXCIsIG9uY2xvc2UpO1xuICAgICAgICAgICAgdGhpcy5vZmYoXCJ1cGdyYWRpbmdcIiwgb251cGdyYWRlKTtcbiAgICAgICAgfTtcbiAgICAgICAgdHJhbnNwb3J0Lm9uY2UoXCJvcGVuXCIsIG9uVHJhbnNwb3J0T3Blbik7XG4gICAgICAgIHRyYW5zcG9ydC5vbmNlKFwiZXJyb3JcIiwgb25lcnJvcik7XG4gICAgICAgIHRyYW5zcG9ydC5vbmNlKFwiY2xvc2VcIiwgb25UcmFuc3BvcnRDbG9zZSk7XG4gICAgICAgIHRoaXMub25jZShcImNsb3NlXCIsIG9uY2xvc2UpO1xuICAgICAgICB0aGlzLm9uY2UoXCJ1cGdyYWRpbmdcIiwgb251cGdyYWRlKTtcbiAgICAgICAgdHJhbnNwb3J0Lm9wZW4oKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gY29ubmVjdGlvbiBpcyBkZWVtZWQgb3Blbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25PcGVuKCkge1xuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBcIm9wZW5cIjtcbiAgICAgICAgU29ja2V0LnByaW9yV2Vic29ja2V0U3VjY2VzcyA9IFwid2Vic29ja2V0XCIgPT09IHRoaXMudHJhbnNwb3J0Lm5hbWU7XG4gICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwib3BlblwiKTtcbiAgICAgICAgdGhpcy5mbHVzaCgpO1xuICAgICAgICAvLyB3ZSBjaGVjayBmb3IgYHJlYWR5U3RhdGVgIGluIGNhc2UgYW4gYG9wZW5gXG4gICAgICAgIC8vIGxpc3RlbmVyIGFscmVhZHkgY2xvc2VkIHRoZSBzb2NrZXRcbiAgICAgICAgaWYgKFwib3BlblwiID09PSB0aGlzLnJlYWR5U3RhdGUgJiYgdGhpcy5vcHRzLnVwZ3JhZGUpIHtcbiAgICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICAgIGNvbnN0IGwgPSB0aGlzLnVwZ3JhZGVzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9iZSh0aGlzLnVwZ3JhZGVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGEgcGFja2V0LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvblBhY2tldChwYWNrZXQpIHtcbiAgICAgICAgaWYgKFwib3BlbmluZ1wiID09PSB0aGlzLnJlYWR5U3RhdGUgfHxcbiAgICAgICAgICAgIFwib3BlblwiID09PSB0aGlzLnJlYWR5U3RhdGUgfHxcbiAgICAgICAgICAgIFwiY2xvc2luZ1wiID09PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicGFja2V0XCIsIHBhY2tldCk7XG4gICAgICAgICAgICAvLyBTb2NrZXQgaXMgbGl2ZSAtIGFueSBwYWNrZXQgY291bnRzXG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImhlYXJ0YmVhdFwiKTtcbiAgICAgICAgICAgIHN3aXRjaCAocGFja2V0LnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwib3BlblwiOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uSGFuZHNoYWtlKEpTT04ucGFyc2UocGFja2V0LmRhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInBpbmdcIjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFBpbmdUaW1lb3V0KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZFBhY2tldChcInBvbmdcIik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicGluZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJwb25nXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZXJyb3JcIjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKFwic2VydmVyIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgICAgIGVyci5jb2RlID0gcGFja2V0LmRhdGE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwibWVzc2FnZVwiOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImRhdGFcIiwgcGFja2V0LmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcIm1lc3NhZ2VcIiwgcGFja2V0LmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBoYW5kc2hha2UgY29tcGxldGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gaGFuZHNoYWtlIG9ialxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25IYW5kc2hha2UoZGF0YSkge1xuICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImhhbmRzaGFrZVwiLCBkYXRhKTtcbiAgICAgICAgdGhpcy5pZCA9IGRhdGEuc2lkO1xuICAgICAgICB0aGlzLnRyYW5zcG9ydC5xdWVyeS5zaWQgPSBkYXRhLnNpZDtcbiAgICAgICAgdGhpcy51cGdyYWRlcyA9IHRoaXMuZmlsdGVyVXBncmFkZXMoZGF0YS51cGdyYWRlcyk7XG4gICAgICAgIHRoaXMucGluZ0ludGVydmFsID0gZGF0YS5waW5nSW50ZXJ2YWw7XG4gICAgICAgIHRoaXMucGluZ1RpbWVvdXQgPSBkYXRhLnBpbmdUaW1lb3V0O1xuICAgICAgICB0aGlzLm1heFBheWxvYWQgPSBkYXRhLm1heFBheWxvYWQ7XG4gICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgIC8vIEluIGNhc2Ugb3BlbiBoYW5kbGVyIGNsb3NlcyBzb2NrZXRcbiAgICAgICAgaWYgKFwiY2xvc2VkXCIgPT09IHRoaXMucmVhZHlTdGF0ZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5yZXNldFBpbmdUaW1lb3V0KCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgYW5kIHJlc2V0cyBwaW5nIHRpbWVvdXQgdGltZXIgYmFzZWQgb24gc2VydmVyIHBpbmdzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICByZXNldFBpbmdUaW1lb3V0KCkge1xuICAgICAgICB0aGlzLmNsZWFyVGltZW91dEZuKHRoaXMucGluZ1RpbWVvdXRUaW1lcik7XG4gICAgICAgIHRoaXMucGluZ1RpbWVvdXRUaW1lciA9IHRoaXMuc2V0VGltZW91dEZuKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25DbG9zZShcInBpbmcgdGltZW91dFwiKTtcbiAgICAgICAgfSwgdGhpcy5waW5nSW50ZXJ2YWwgKyB0aGlzLnBpbmdUaW1lb3V0KTtcbiAgICAgICAgaWYgKHRoaXMub3B0cy5hdXRvVW5yZWYpIHtcbiAgICAgICAgICAgIHRoaXMucGluZ1RpbWVvdXRUaW1lci51bnJlZigpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCBvbiBgZHJhaW5gIGV2ZW50XG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uRHJhaW4oKSB7XG4gICAgICAgIHRoaXMud3JpdGVCdWZmZXIuc3BsaWNlKDAsIHRoaXMucHJldkJ1ZmZlckxlbik7XG4gICAgICAgIC8vIHNldHRpbmcgcHJldkJ1ZmZlckxlbiA9IDAgaXMgdmVyeSBpbXBvcnRhbnRcbiAgICAgICAgLy8gZm9yIGV4YW1wbGUsIHdoZW4gdXBncmFkaW5nLCB1cGdyYWRlIHBhY2tldCBpcyBzZW50IG92ZXIsXG4gICAgICAgIC8vIGFuZCBhIG5vbnplcm8gcHJldkJ1ZmZlckxlbiBjb3VsZCBjYXVzZSBwcm9ibGVtcyBvbiBgZHJhaW5gXG4gICAgICAgIHRoaXMucHJldkJ1ZmZlckxlbiA9IDA7XG4gICAgICAgIGlmICgwID09PSB0aGlzLndyaXRlQnVmZmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJkcmFpblwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZmx1c2goKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBGbHVzaCB3cml0ZSBidWZmZXJzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmbHVzaCgpIHtcbiAgICAgICAgaWYgKFwiY2xvc2VkXCIgIT09IHRoaXMucmVhZHlTdGF0ZSAmJlxuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQud3JpdGFibGUgJiZcbiAgICAgICAgICAgICF0aGlzLnVwZ3JhZGluZyAmJlxuICAgICAgICAgICAgdGhpcy53cml0ZUJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldHMgPSB0aGlzLmdldFdyaXRhYmxlUGFja2V0cygpO1xuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQuc2VuZChwYWNrZXRzKTtcbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgY3VycmVudCBsZW5ndGggb2Ygd3JpdGVCdWZmZXJcbiAgICAgICAgICAgIC8vIHNwbGljZSB3cml0ZUJ1ZmZlciBhbmQgY2FsbGJhY2tCdWZmZXIgb24gYGRyYWluYFxuICAgICAgICAgICAgdGhpcy5wcmV2QnVmZmVyTGVuID0gcGFja2V0cy5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImZsdXNoXCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGUgZW5jb2RlZCBzaXplIG9mIHRoZSB3cml0ZUJ1ZmZlciBpcyBiZWxvdyB0aGUgbWF4UGF5bG9hZCB2YWx1ZSBzZW50IGJ5IHRoZSBzZXJ2ZXIgKG9ubHkgZm9yIEhUVFBcbiAgICAgKiBsb25nLXBvbGxpbmcpXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGdldFdyaXRhYmxlUGFja2V0cygpIHtcbiAgICAgICAgY29uc3Qgc2hvdWxkQ2hlY2tQYXlsb2FkU2l6ZSA9IHRoaXMubWF4UGF5bG9hZCAmJlxuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQubmFtZSA9PT0gXCJwb2xsaW5nXCIgJiZcbiAgICAgICAgICAgIHRoaXMud3JpdGVCdWZmZXIubGVuZ3RoID4gMTtcbiAgICAgICAgaWYgKCFzaG91bGRDaGVja1BheWxvYWRTaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy53cml0ZUJ1ZmZlcjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcGF5bG9hZFNpemUgPSAxOyAvLyBmaXJzdCBwYWNrZXQgdHlwZVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMud3JpdGVCdWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLndyaXRlQnVmZmVyW2ldLmRhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHBheWxvYWRTaXplICs9IGJ5dGVMZW5ndGgoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaSA+IDAgJiYgcGF5bG9hZFNpemUgPiB0aGlzLm1heFBheWxvYWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53cml0ZUJ1ZmZlci5zbGljZSgwLCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBheWxvYWRTaXplICs9IDI7IC8vIHNlcGFyYXRvciArIHBhY2tldCB0eXBlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMud3JpdGVCdWZmZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNlbmRzIGEgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtc2cgLSBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEByZXR1cm4ge1NvY2tldH0gZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHdyaXRlKG1zZywgb3B0aW9ucywgZm4pIHtcbiAgICAgICAgdGhpcy5zZW5kUGFja2V0KFwibWVzc2FnZVwiLCBtc2csIG9wdGlvbnMsIGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHNlbmQobXNnLCBvcHRpb25zLCBmbikge1xuICAgICAgICB0aGlzLnNlbmRQYWNrZXQoXCJtZXNzYWdlXCIsIG1zZywgb3B0aW9ucywgZm4pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2VuZHMgYSBwYWNrZXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZTogcGFja2V0IHR5cGUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gLSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHNlbmRQYWNrZXQodHlwZSwgZGF0YSwgb3B0aW9ucywgZm4pIHtcbiAgICAgICAgaWYgKFwiZnVuY3Rpb25cIiA9PT0gdHlwZW9mIGRhdGEpIHtcbiAgICAgICAgICAgIGZuID0gZGF0YTtcbiAgICAgICAgICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFwiZnVuY3Rpb25cIiA9PT0gdHlwZW9mIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGZuID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcImNsb3NpbmdcIiA9PT0gdGhpcy5yZWFkeVN0YXRlIHx8IFwiY2xvc2VkXCIgPT09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBvcHRpb25zLmNvbXByZXNzID0gZmFsc2UgIT09IG9wdGlvbnMuY29tcHJlc3M7XG4gICAgICAgIGNvbnN0IHBhY2tldCA9IHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJwYWNrZXRDcmVhdGVcIiwgcGFja2V0KTtcbiAgICAgICAgdGhpcy53cml0ZUJ1ZmZlci5wdXNoKHBhY2tldCk7XG4gICAgICAgIGlmIChmbilcbiAgICAgICAgICAgIHRoaXMub25jZShcImZsdXNoXCIsIGZuKTtcbiAgICAgICAgdGhpcy5mbHVzaCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgdGhlIGNvbm5lY3Rpb24uXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGNvbnN0IGNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbkNsb3NlKFwiZm9yY2VkIGNsb3NlXCIpO1xuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgY2xlYW51cEFuZENsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vZmYoXCJ1cGdyYWRlXCIsIGNsZWFudXBBbmRDbG9zZSk7XG4gICAgICAgICAgICB0aGlzLm9mZihcInVwZ3JhZGVFcnJvclwiLCBjbGVhbnVwQW5kQ2xvc2UpO1xuICAgICAgICAgICAgY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgd2FpdEZvclVwZ3JhZGUgPSAoKSA9PiB7XG4gICAgICAgICAgICAvLyB3YWl0IGZvciB1cGdyYWRlIHRvIGZpbmlzaCBzaW5jZSB3ZSBjYW4ndCBzZW5kIHBhY2tldHMgd2hpbGUgcGF1c2luZyBhIHRyYW5zcG9ydFxuICAgICAgICAgICAgdGhpcy5vbmNlKFwidXBncmFkZVwiLCBjbGVhbnVwQW5kQ2xvc2UpO1xuICAgICAgICAgICAgdGhpcy5vbmNlKFwidXBncmFkZUVycm9yXCIsIGNsZWFudXBBbmRDbG9zZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmIChcIm9wZW5pbmdcIiA9PT0gdGhpcy5yZWFkeVN0YXRlIHx8IFwib3BlblwiID09PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFwiY2xvc2luZ1wiO1xuICAgICAgICAgICAgaWYgKHRoaXMud3JpdGVCdWZmZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbmNlKFwiZHJhaW5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cGdyYWRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JVcGdyYWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLnVwZ3JhZGluZykge1xuICAgICAgICAgICAgICAgIHdhaXRGb3JVcGdyYWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiB0cmFuc3BvcnQgZXJyb3JcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25FcnJvcihlcnIpIHtcbiAgICAgICAgU29ja2V0LnByaW9yV2Vic29ja2V0U3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImVycm9yXCIsIGVycik7XG4gICAgICAgIHRoaXMub25DbG9zZShcInRyYW5zcG9ydCBlcnJvclwiLCBlcnIpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiB0cmFuc3BvcnQgY2xvc2UuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uQ2xvc2UocmVhc29uLCBkZXNjcmlwdGlvbikge1xuICAgICAgICBpZiAoXCJvcGVuaW5nXCIgPT09IHRoaXMucmVhZHlTdGF0ZSB8fFxuICAgICAgICAgICAgXCJvcGVuXCIgPT09IHRoaXMucmVhZHlTdGF0ZSB8fFxuICAgICAgICAgICAgXCJjbG9zaW5nXCIgPT09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgLy8gY2xlYXIgdGltZXJzXG4gICAgICAgICAgICB0aGlzLmNsZWFyVGltZW91dEZuKHRoaXMucGluZ1RpbWVvdXRUaW1lcik7XG4gICAgICAgICAgICAvLyBzdG9wIGV2ZW50IGZyb20gZmlyaW5nIGFnYWluIGZvciB0cmFuc3BvcnRcbiAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0LnJlbW92ZUFsbExpc3RlbmVycyhcImNsb3NlXCIpO1xuICAgICAgICAgICAgLy8gZW5zdXJlIHRyYW5zcG9ydCB3b24ndCBzdGF5IG9wZW5cbiAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0LmNsb3NlKCk7XG4gICAgICAgICAgICAvLyBpZ25vcmUgZnVydGhlciB0cmFuc3BvcnQgY29tbXVuaWNhdGlvblxuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlbW92ZUV2ZW50TGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgdGhpcy5iZWZvcmV1bmxvYWRFdmVudExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm9mZmxpbmVcIiwgdGhpcy5vZmZsaW5lRXZlbnRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2V0IHJlYWR5IHN0YXRlXG4gICAgICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBcImNsb3NlZFwiO1xuICAgICAgICAgICAgLy8gY2xlYXIgc2Vzc2lvbiBpZFxuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICAvLyBlbWl0IGNsb3NlIGV2ZW50XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImNsb3NlXCIsIHJlYXNvbiwgZGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgLy8gY2xlYW4gYnVmZmVycyBhZnRlciwgc28gdXNlcnMgY2FuIHN0aWxsXG4gICAgICAgICAgICAvLyBncmFiIHRoZSBidWZmZXJzIG9uIGBjbG9zZWAgZXZlbnRcbiAgICAgICAgICAgIHRoaXMud3JpdGVCdWZmZXIgPSBbXTtcbiAgICAgICAgICAgIHRoaXMucHJldkJ1ZmZlckxlbiA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRmlsdGVycyB1cGdyYWRlcywgcmV0dXJuaW5nIG9ubHkgdGhvc2UgbWF0Y2hpbmcgY2xpZW50IHRyYW5zcG9ydHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB1cGdyYWRlcyAtIHNlcnZlciB1cGdyYWRlc1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZmlsdGVyVXBncmFkZXModXBncmFkZXMpIHtcbiAgICAgICAgY29uc3QgZmlsdGVyZWRVcGdyYWRlcyA9IFtdO1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIGNvbnN0IGogPSB1cGdyYWRlcy5sZW5ndGg7XG4gICAgICAgIGZvciAoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgICBpZiAofnRoaXMudHJhbnNwb3J0cy5pbmRleE9mKHVwZ3JhZGVzW2ldKSlcbiAgICAgICAgICAgICAgICBmaWx0ZXJlZFVwZ3JhZGVzLnB1c2godXBncmFkZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZFVwZ3JhZGVzO1xuICAgIH1cbn1cblNvY2tldC5wcm90b2NvbCA9IHByb3RvY29sO1xuIiwiaW1wb3J0IHsgcGFyc2UgfSBmcm9tIFwiZW5naW5lLmlvLWNsaWVudFwiO1xuLyoqXG4gKiBVUkwgcGFyc2VyLlxuICpcbiAqIEBwYXJhbSB1cmkgLSB1cmxcbiAqIEBwYXJhbSBwYXRoIC0gdGhlIHJlcXVlc3QgcGF0aCBvZiB0aGUgY29ubmVjdGlvblxuICogQHBhcmFtIGxvYyAtIEFuIG9iamVjdCBtZWFudCB0byBtaW1pYyB3aW5kb3cubG9jYXRpb24uXG4gKiAgICAgICAgRGVmYXVsdHMgdG8gd2luZG93LmxvY2F0aW9uLlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgZnVuY3Rpb24gdXJsKHVyaSwgcGF0aCA9IFwiXCIsIGxvYykge1xuICAgIGxldCBvYmogPSB1cmk7XG4gICAgLy8gZGVmYXVsdCB0byB3aW5kb3cubG9jYXRpb25cbiAgICBsb2MgPSBsb2MgfHwgKHR5cGVvZiBsb2NhdGlvbiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBsb2NhdGlvbik7XG4gICAgaWYgKG51bGwgPT0gdXJpKVxuICAgICAgICB1cmkgPSBsb2MucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2MuaG9zdDtcbiAgICAvLyByZWxhdGl2ZSBwYXRoIHN1cHBvcnRcbiAgICBpZiAodHlwZW9mIHVyaSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBpZiAoXCIvXCIgPT09IHVyaS5jaGFyQXQoMCkpIHtcbiAgICAgICAgICAgIGlmIChcIi9cIiA9PT0gdXJpLmNoYXJBdCgxKSkge1xuICAgICAgICAgICAgICAgIHVyaSA9IGxvYy5wcm90b2NvbCArIHVyaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHVyaSA9IGxvYy5ob3N0ICsgdXJpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghL14oaHR0cHM/fHdzcz8pOlxcL1xcLy8udGVzdCh1cmkpKSB7XG4gICAgICAgICAgICBpZiAoXCJ1bmRlZmluZWRcIiAhPT0gdHlwZW9mIGxvYykge1xuICAgICAgICAgICAgICAgIHVyaSA9IGxvYy5wcm90b2NvbCArIFwiLy9cIiArIHVyaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHVyaSA9IFwiaHR0cHM6Ly9cIiArIHVyaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBwYXJzZVxuICAgICAgICBvYmogPSBwYXJzZSh1cmkpO1xuICAgIH1cbiAgICAvLyBtYWtlIHN1cmUgd2UgdHJlYXQgYGxvY2FsaG9zdDo4MGAgYW5kIGBsb2NhbGhvc3RgIGVxdWFsbHlcbiAgICBpZiAoIW9iai5wb3J0KSB7XG4gICAgICAgIGlmICgvXihodHRwfHdzKSQvLnRlc3Qob2JqLnByb3RvY29sKSkge1xuICAgICAgICAgICAgb2JqLnBvcnQgPSBcIjgwXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL14oaHR0cHx3cylzJC8udGVzdChvYmoucHJvdG9jb2wpKSB7XG4gICAgICAgICAgICBvYmoucG9ydCA9IFwiNDQzXCI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgb2JqLnBhdGggPSBvYmoucGF0aCB8fCBcIi9cIjtcbiAgICBjb25zdCBpcHY2ID0gb2JqLmhvc3QuaW5kZXhPZihcIjpcIikgIT09IC0xO1xuICAgIGNvbnN0IGhvc3QgPSBpcHY2ID8gXCJbXCIgKyBvYmouaG9zdCArIFwiXVwiIDogb2JqLmhvc3Q7XG4gICAgLy8gZGVmaW5lIHVuaXF1ZSBpZFxuICAgIG9iai5pZCA9IG9iai5wcm90b2NvbCArIFwiOi8vXCIgKyBob3N0ICsgXCI6XCIgKyBvYmoucG9ydCArIHBhdGg7XG4gICAgLy8gZGVmaW5lIGhyZWZcbiAgICBvYmouaHJlZiA9XG4gICAgICAgIG9iai5wcm90b2NvbCArXG4gICAgICAgICAgICBcIjovL1wiICtcbiAgICAgICAgICAgIGhvc3QgK1xuICAgICAgICAgICAgKGxvYyAmJiBsb2MucG9ydCA9PT0gb2JqLnBvcnQgPyBcIlwiIDogXCI6XCIgKyBvYmoucG9ydCk7XG4gICAgcmV0dXJuIG9iajtcbn1cbiIsImNvbnN0IHdpdGhOYXRpdmVBcnJheUJ1ZmZlciA9IHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gXCJmdW5jdGlvblwiO1xuY29uc3QgaXNWaWV3ID0gKG9iaikgPT4ge1xuICAgIHJldHVybiB0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgPyBBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKVxuICAgICAgICA6IG9iai5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbn07XG5jb25zdCB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5jb25zdCB3aXRoTmF0aXZlQmxvYiA9IHR5cGVvZiBCbG9iID09PSBcImZ1bmN0aW9uXCIgfHxcbiAgICAodHlwZW9mIEJsb2IgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgdG9TdHJpbmcuY2FsbChCbG9iKSA9PT0gXCJbb2JqZWN0IEJsb2JDb25zdHJ1Y3Rvcl1cIik7XG5jb25zdCB3aXRoTmF0aXZlRmlsZSA9IHR5cGVvZiBGaWxlID09PSBcImZ1bmN0aW9uXCIgfHxcbiAgICAodHlwZW9mIEZpbGUgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgdG9TdHJpbmcuY2FsbChGaWxlKSA9PT0gXCJbb2JqZWN0IEZpbGVDb25zdHJ1Y3Rvcl1cIik7XG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBvYmogaXMgYSBCdWZmZXIsIGFuIEFycmF5QnVmZmVyLCBhIEJsb2Igb3IgYSBGaWxlLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JpbmFyeShvYmopIHtcbiAgICByZXR1cm4gKCh3aXRoTmF0aXZlQXJyYXlCdWZmZXIgJiYgKG9iaiBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IGlzVmlldyhvYmopKSkgfHxcbiAgICAgICAgKHdpdGhOYXRpdmVCbG9iICYmIG9iaiBpbnN0YW5jZW9mIEJsb2IpIHx8XG4gICAgICAgICh3aXRoTmF0aXZlRmlsZSAmJiBvYmogaW5zdGFuY2VvZiBGaWxlKSk7XG59XG5leHBvcnQgZnVuY3Rpb24gaGFzQmluYXJ5KG9iaiwgdG9KU09OKSB7XG4gICAgaWYgKCFvYmogfHwgdHlwZW9mIG9iaiAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaGFzQmluYXJ5KG9ialtpXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChpc0JpbmFyeShvYmopKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAob2JqLnRvSlNPTiAmJlxuICAgICAgICB0eXBlb2Ygb2JqLnRvSlNPTiA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgIGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGhhc0JpbmFyeShvYmoudG9KU09OKCksIHRydWUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkgJiYgaGFzQmluYXJ5KG9ialtrZXldKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuIiwiaW1wb3J0IHsgaXNCaW5hcnkgfSBmcm9tIFwiLi9pcy1iaW5hcnkuanNcIjtcbi8qKlxuICogUmVwbGFjZXMgZXZlcnkgQnVmZmVyIHwgQXJyYXlCdWZmZXIgfCBCbG9iIHwgRmlsZSBpbiBwYWNrZXQgd2l0aCBhIG51bWJlcmVkIHBsYWNlaG9sZGVyLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYWNrZXQgLSBzb2NrZXQuaW8gZXZlbnQgcGFja2V0XG4gKiBAcmV0dXJuIHtPYmplY3R9IHdpdGggZGVjb25zdHJ1Y3RlZCBwYWNrZXQgYW5kIGxpc3Qgb2YgYnVmZmVyc1xuICogQHB1YmxpY1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjb25zdHJ1Y3RQYWNrZXQocGFja2V0KSB7XG4gICAgY29uc3QgYnVmZmVycyA9IFtdO1xuICAgIGNvbnN0IHBhY2tldERhdGEgPSBwYWNrZXQuZGF0YTtcbiAgICBjb25zdCBwYWNrID0gcGFja2V0O1xuICAgIHBhY2suZGF0YSA9IF9kZWNvbnN0cnVjdFBhY2tldChwYWNrZXREYXRhLCBidWZmZXJzKTtcbiAgICBwYWNrLmF0dGFjaG1lbnRzID0gYnVmZmVycy5sZW5ndGg7IC8vIG51bWJlciBvZiBiaW5hcnkgJ2F0dGFjaG1lbnRzJ1xuICAgIHJldHVybiB7IHBhY2tldDogcGFjaywgYnVmZmVyczogYnVmZmVycyB9O1xufVxuZnVuY3Rpb24gX2RlY29uc3RydWN0UGFja2V0KGRhdGEsIGJ1ZmZlcnMpIHtcbiAgICBpZiAoIWRhdGEpXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIGlmIChpc0JpbmFyeShkYXRhKSkge1xuICAgICAgICBjb25zdCBwbGFjZWhvbGRlciA9IHsgX3BsYWNlaG9sZGVyOiB0cnVlLCBudW06IGJ1ZmZlcnMubGVuZ3RoIH07XG4gICAgICAgIGJ1ZmZlcnMucHVzaChkYXRhKTtcbiAgICAgICAgcmV0dXJuIHBsYWNlaG9sZGVyO1xuICAgIH1cbiAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSBuZXcgQXJyYXkoZGF0YS5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG5ld0RhdGFbaV0gPSBfZGVjb25zdHJ1Y3RQYWNrZXQoZGF0YVtpXSwgYnVmZmVycyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0RhdGE7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRhID09PSBcIm9iamVjdFwiICYmICEoZGF0YSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgbmV3RGF0YVtrZXldID0gX2RlY29uc3RydWN0UGFja2V0KGRhdGFba2V5XSwgYnVmZmVycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0RhdGE7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuLyoqXG4gKiBSZWNvbnN0cnVjdHMgYSBiaW5hcnkgcGFja2V0IGZyb20gaXRzIHBsYWNlaG9sZGVyIHBhY2tldCBhbmQgYnVmZmVyc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYWNrZXQgLSBldmVudCBwYWNrZXQgd2l0aCBwbGFjZWhvbGRlcnNcbiAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlcnMgLSBiaW5hcnkgYnVmZmVycyB0byBwdXQgaW4gcGxhY2Vob2xkZXIgcG9zaXRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IHJlY29uc3RydWN0ZWQgcGFja2V0XG4gKiBAcHVibGljXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWNvbnN0cnVjdFBhY2tldChwYWNrZXQsIGJ1ZmZlcnMpIHtcbiAgICBwYWNrZXQuZGF0YSA9IF9yZWNvbnN0cnVjdFBhY2tldChwYWNrZXQuZGF0YSwgYnVmZmVycyk7XG4gICAgZGVsZXRlIHBhY2tldC5hdHRhY2htZW50czsgLy8gbm8gbG9uZ2VyIHVzZWZ1bFxuICAgIHJldHVybiBwYWNrZXQ7XG59XG5mdW5jdGlvbiBfcmVjb25zdHJ1Y3RQYWNrZXQoZGF0YSwgYnVmZmVycykge1xuICAgIGlmICghZGF0YSlcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgaWYgKGRhdGEgJiYgZGF0YS5fcGxhY2Vob2xkZXIgPT09IHRydWUpIHtcbiAgICAgICAgY29uc3QgaXNJbmRleFZhbGlkID0gdHlwZW9mIGRhdGEubnVtID09PSBcIm51bWJlclwiICYmXG4gICAgICAgICAgICBkYXRhLm51bSA+PSAwICYmXG4gICAgICAgICAgICBkYXRhLm51bSA8IGJ1ZmZlcnMubGVuZ3RoO1xuICAgICAgICBpZiAoaXNJbmRleFZhbGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gYnVmZmVyc1tkYXRhLm51bV07IC8vIGFwcHJvcHJpYXRlIGJ1ZmZlciAoc2hvdWxkIGJlIG5hdHVyYWwgb3JkZXIgYW55d2F5KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaWxsZWdhbCBhdHRhY2htZW50c1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZGF0YVtpXSA9IF9yZWNvbnN0cnVjdFBhY2tldChkYXRhW2ldLCBidWZmZXJzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZGF0YSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGRhdGEsIGtleSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSBfcmVjb25zdHJ1Y3RQYWNrZXQoZGF0YVtrZXldLCBidWZmZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cbiIsImltcG9ydCB7IEVtaXR0ZXIgfSBmcm9tIFwiQHNvY2tldC5pby9jb21wb25lbnQtZW1pdHRlclwiO1xuaW1wb3J0IHsgZGVjb25zdHJ1Y3RQYWNrZXQsIHJlY29uc3RydWN0UGFja2V0IH0gZnJvbSBcIi4vYmluYXJ5LmpzXCI7XG5pbXBvcnQgeyBpc0JpbmFyeSwgaGFzQmluYXJ5IH0gZnJvbSBcIi4vaXMtYmluYXJ5LmpzXCI7XG4vKipcbiAqIFRoZXNlIHN0cmluZ3MgbXVzdCBub3QgYmUgdXNlZCBhcyBldmVudCBuYW1lcywgYXMgdGhleSBoYXZlIGEgc3BlY2lhbCBtZWFuaW5nLlxuICovXG5jb25zdCBSRVNFUlZFRF9FVkVOVFMgPSBbXG4gICAgXCJjb25uZWN0XCIsXG4gICAgXCJjb25uZWN0X2Vycm9yXCIsXG4gICAgXCJkaXNjb25uZWN0XCIsXG4gICAgXCJkaXNjb25uZWN0aW5nXCIsXG4gICAgXCJuZXdMaXN0ZW5lclwiLFxuICAgIFwicmVtb3ZlTGlzdGVuZXJcIiwgLy8gdXNlZCBieSB0aGUgTm9kZS5qcyBFdmVudEVtaXR0ZXJcbl07XG4vKipcbiAqIFByb3RvY29sIHZlcnNpb24uXG4gKlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgY29uc3QgcHJvdG9jb2wgPSA1O1xuZXhwb3J0IHZhciBQYWNrZXRUeXBlO1xuKGZ1bmN0aW9uIChQYWNrZXRUeXBlKSB7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiQ09OTkVDVFwiXSA9IDBdID0gXCJDT05ORUNUXCI7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiRElTQ09OTkVDVFwiXSA9IDFdID0gXCJESVNDT05ORUNUXCI7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiRVZFTlRcIl0gPSAyXSA9IFwiRVZFTlRcIjtcbiAgICBQYWNrZXRUeXBlW1BhY2tldFR5cGVbXCJBQ0tcIl0gPSAzXSA9IFwiQUNLXCI7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiQ09OTkVDVF9FUlJPUlwiXSA9IDRdID0gXCJDT05ORUNUX0VSUk9SXCI7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiQklOQVJZX0VWRU5UXCJdID0gNV0gPSBcIkJJTkFSWV9FVkVOVFwiO1xuICAgIFBhY2tldFR5cGVbUGFja2V0VHlwZVtcIkJJTkFSWV9BQ0tcIl0gPSA2XSA9IFwiQklOQVJZX0FDS1wiO1xufSkoUGFja2V0VHlwZSB8fCAoUGFja2V0VHlwZSA9IHt9KSk7XG4vKipcbiAqIEEgc29ja2V0LmlvIEVuY29kZXIgaW5zdGFuY2VcbiAqL1xuZXhwb3J0IGNsYXNzIEVuY29kZXIge1xuICAgIC8qKlxuICAgICAqIEVuY29kZXIgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHJlcGxhY2VyIC0gY3VzdG9tIHJlcGxhY2VyIHRvIHBhc3MgZG93biB0byBKU09OLnBhcnNlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocmVwbGFjZXIpIHtcbiAgICAgICAgdGhpcy5yZXBsYWNlciA9IHJlcGxhY2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbmNvZGUgYSBwYWNrZXQgYXMgYSBzaW5nbGUgc3RyaW5nIGlmIG5vbi1iaW5hcnksIG9yIGFzIGFcbiAgICAgKiBidWZmZXIgc2VxdWVuY2UsIGRlcGVuZGluZyBvbiBwYWNrZXQgdHlwZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBwYWNrZXQgb2JqZWN0XG4gICAgICovXG4gICAgZW5jb2RlKG9iaikge1xuICAgICAgICBpZiAob2JqLnR5cGUgPT09IFBhY2tldFR5cGUuRVZFTlQgfHwgb2JqLnR5cGUgPT09IFBhY2tldFR5cGUuQUNLKSB7XG4gICAgICAgICAgICBpZiAoaGFzQmluYXJ5KG9iaikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGVBc0JpbmFyeSh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG9iai50eXBlID09PSBQYWNrZXRUeXBlLkVWRU5UXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFBhY2tldFR5cGUuQklOQVJZX0VWRU5UXG4gICAgICAgICAgICAgICAgICAgICAgICA6IFBhY2tldFR5cGUuQklOQVJZX0FDSyxcbiAgICAgICAgICAgICAgICAgICAgbnNwOiBvYmoubnNwLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBvYmouZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG9iai5pZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RoaXMuZW5jb2RlQXNTdHJpbmcob2JqKV07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuY29kZSBwYWNrZXQgYXMgc3RyaW5nLlxuICAgICAqL1xuICAgIGVuY29kZUFzU3RyaW5nKG9iaikge1xuICAgICAgICAvLyBmaXJzdCBpcyB0eXBlXG4gICAgICAgIGxldCBzdHIgPSBcIlwiICsgb2JqLnR5cGU7XG4gICAgICAgIC8vIGF0dGFjaG1lbnRzIGlmIHdlIGhhdmUgdGhlbVxuICAgICAgICBpZiAob2JqLnR5cGUgPT09IFBhY2tldFR5cGUuQklOQVJZX0VWRU5UIHx8XG4gICAgICAgICAgICBvYmoudHlwZSA9PT0gUGFja2V0VHlwZS5CSU5BUllfQUNLKSB7XG4gICAgICAgICAgICBzdHIgKz0gb2JqLmF0dGFjaG1lbnRzICsgXCItXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIG5hbWVzcGFjZSBvdGhlciB0aGFuIGAvYFxuICAgICAgICAvLyB3ZSBhcHBlbmQgaXQgZm9sbG93ZWQgYnkgYSBjb21tYSBgLGBcbiAgICAgICAgaWYgKG9iai5uc3AgJiYgXCIvXCIgIT09IG9iai5uc3ApIHtcbiAgICAgICAgICAgIHN0ciArPSBvYmoubnNwICsgXCIsXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaW1tZWRpYXRlbHkgZm9sbG93ZWQgYnkgdGhlIGlkXG4gICAgICAgIGlmIChudWxsICE9IG9iai5pZCkge1xuICAgICAgICAgICAgc3RyICs9IG9iai5pZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBqc29uIGRhdGFcbiAgICAgICAgaWYgKG51bGwgIT0gb2JqLmRhdGEpIHtcbiAgICAgICAgICAgIHN0ciArPSBKU09OLnN0cmluZ2lmeShvYmouZGF0YSwgdGhpcy5yZXBsYWNlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW5jb2RlIHBhY2tldCBhcyAnYnVmZmVyIHNlcXVlbmNlJyBieSByZW1vdmluZyBibG9icywgYW5kXG4gICAgICogZGVjb25zdHJ1Y3RpbmcgcGFja2V0IGludG8gb2JqZWN0IHdpdGggcGxhY2Vob2xkZXJzIGFuZFxuICAgICAqIGEgbGlzdCBvZiBidWZmZXJzLlxuICAgICAqL1xuICAgIGVuY29kZUFzQmluYXJ5KG9iaikge1xuICAgICAgICBjb25zdCBkZWNvbnN0cnVjdGlvbiA9IGRlY29uc3RydWN0UGFja2V0KG9iaik7XG4gICAgICAgIGNvbnN0IHBhY2sgPSB0aGlzLmVuY29kZUFzU3RyaW5nKGRlY29uc3RydWN0aW9uLnBhY2tldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlcnMgPSBkZWNvbnN0cnVjdGlvbi5idWZmZXJzO1xuICAgICAgICBidWZmZXJzLnVuc2hpZnQocGFjayk7IC8vIGFkZCBwYWNrZXQgaW5mbyB0byBiZWdpbm5pbmcgb2YgZGF0YSBsaXN0XG4gICAgICAgIHJldHVybiBidWZmZXJzOyAvLyB3cml0ZSBhbGwgdGhlIGJ1ZmZlcnNcbiAgICB9XG59XG4vLyBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvODUxMTI4MS9jaGVjay1pZi1hLXZhbHVlLWlzLWFuLW9iamVjdC1pbi1qYXZhc2NyaXB0XG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgT2JqZWN0XVwiO1xufVxuLyoqXG4gKiBBIHNvY2tldC5pbyBEZWNvZGVyIGluc3RhbmNlXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBkZWNvZGVyXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWNvZGVyIGV4dGVuZHMgRW1pdHRlciB7XG4gICAgLyoqXG4gICAgICogRGVjb2RlciBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gcmV2aXZlciAtIGN1c3RvbSByZXZpdmVyIHRvIHBhc3MgZG93biB0byBKU09OLnN0cmluZ2lmeVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJldml2ZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5yZXZpdmVyID0gcmV2aXZlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVjb2RlcyBhbiBlbmNvZGVkIHBhY2tldCBzdHJpbmcgaW50byBwYWNrZXQgSlNPTi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmogLSBlbmNvZGVkIHBhY2tldFxuICAgICAqL1xuICAgIGFkZChvYmopIHtcbiAgICAgICAgbGV0IHBhY2tldDtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJnb3QgcGxhaW50ZXh0IGRhdGEgd2hlbiByZWNvbnN0cnVjdGluZyBhIHBhY2tldFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhY2tldCA9IHRoaXMuZGVjb2RlU3RyaW5nKG9iaik7XG4gICAgICAgICAgICBjb25zdCBpc0JpbmFyeUV2ZW50ID0gcGFja2V0LnR5cGUgPT09IFBhY2tldFR5cGUuQklOQVJZX0VWRU5UO1xuICAgICAgICAgICAgaWYgKGlzQmluYXJ5RXZlbnQgfHwgcGFja2V0LnR5cGUgPT09IFBhY2tldFR5cGUuQklOQVJZX0FDSykge1xuICAgICAgICAgICAgICAgIHBhY2tldC50eXBlID0gaXNCaW5hcnlFdmVudCA/IFBhY2tldFR5cGUuRVZFTlQgOiBQYWNrZXRUeXBlLkFDSztcbiAgICAgICAgICAgICAgICAvLyBiaW5hcnkgcGFja2V0J3MganNvblxuICAgICAgICAgICAgICAgIHRoaXMucmVjb25zdHJ1Y3RvciA9IG5ldyBCaW5hcnlSZWNvbnN0cnVjdG9yKHBhY2tldCk7XG4gICAgICAgICAgICAgICAgLy8gbm8gYXR0YWNobWVudHMsIGxhYmVsZWQgYmluYXJ5IGJ1dCBubyBiaW5hcnkgZGF0YSB0byBmb2xsb3dcbiAgICAgICAgICAgICAgICBpZiAocGFja2V0LmF0dGFjaG1lbnRzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1cGVyLmVtaXRSZXNlcnZlZChcImRlY29kZWRcIiwgcGFja2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBub24tYmluYXJ5IGZ1bGwgcGFja2V0XG4gICAgICAgICAgICAgICAgc3VwZXIuZW1pdFJlc2VydmVkKFwiZGVjb2RlZFwiLCBwYWNrZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzQmluYXJ5KG9iaikgfHwgb2JqLmJhc2U2NCkge1xuICAgICAgICAgICAgLy8gcmF3IGJpbmFyeSBkYXRhXG4gICAgICAgICAgICBpZiAoIXRoaXMucmVjb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImdvdCBiaW5hcnkgZGF0YSB3aGVuIG5vdCByZWNvbnN0cnVjdGluZyBhIHBhY2tldFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhY2tldCA9IHRoaXMucmVjb25zdHJ1Y3Rvci50YWtlQmluYXJ5RGF0YShvYmopO1xuICAgICAgICAgICAgICAgIGlmIChwYWNrZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVjZWl2ZWQgZmluYWwgYnVmZmVyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVjb25zdHJ1Y3RvciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHN1cGVyLmVtaXRSZXNlcnZlZChcImRlY29kZWRcIiwgcGFja2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHR5cGU6IFwiICsgb2JqKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZWNvZGUgYSBwYWNrZXQgU3RyaW5nIChKU09OIGRhdGEpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBwYWNrZXRcbiAgICAgKi9cbiAgICBkZWNvZGVTdHJpbmcoc3RyKSB7XG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgLy8gbG9vayB1cCB0eXBlXG4gICAgICAgIGNvbnN0IHAgPSB7XG4gICAgICAgICAgICB0eXBlOiBOdW1iZXIoc3RyLmNoYXJBdCgwKSksXG4gICAgICAgIH07XG4gICAgICAgIGlmIChQYWNrZXRUeXBlW3AudHlwZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biBwYWNrZXQgdHlwZSBcIiArIHAudHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbG9vayB1cCBhdHRhY2htZW50cyBpZiB0eXBlIGJpbmFyeVxuICAgICAgICBpZiAocC50eXBlID09PSBQYWNrZXRUeXBlLkJJTkFSWV9FVkVOVCB8fFxuICAgICAgICAgICAgcC50eXBlID09PSBQYWNrZXRUeXBlLkJJTkFSWV9BQ0spIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICB3aGlsZSAoc3RyLmNoYXJBdCgrK2kpICE9PSBcIi1cIiAmJiBpICE9IHN0ci5sZW5ndGgpIHsgfVxuICAgICAgICAgICAgY29uc3QgYnVmID0gc3RyLnN1YnN0cmluZyhzdGFydCwgaSk7XG4gICAgICAgICAgICBpZiAoYnVmICE9IE51bWJlcihidWYpIHx8IHN0ci5jaGFyQXQoaSkgIT09IFwiLVwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSWxsZWdhbCBhdHRhY2htZW50c1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHAuYXR0YWNobWVudHMgPSBOdW1iZXIoYnVmKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBsb29rIHVwIG5hbWVzcGFjZSAoaWYgYW55KVxuICAgICAgICBpZiAoXCIvXCIgPT09IHN0ci5jaGFyQXQoaSArIDEpKSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgICAgd2hpbGUgKCsraSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBzdHIuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChcIixcIiA9PT0gYylcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IHN0ci5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcC5uc3AgPSBzdHIuc3Vic3RyaW5nKHN0YXJ0LCBpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHAubnNwID0gXCIvXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbG9vayB1cCBpZFxuICAgICAgICBjb25zdCBuZXh0ID0gc3RyLmNoYXJBdChpICsgMSk7XG4gICAgICAgIGlmIChcIlwiICE9PSBuZXh0ICYmIE51bWJlcihuZXh0KSA9PSBuZXh0KSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgICAgd2hpbGUgKCsraSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBzdHIuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChudWxsID09IGMgfHwgTnVtYmVyKGMpICE9IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgLS1pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IHN0ci5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcC5pZCA9IE51bWJlcihzdHIuc3Vic3RyaW5nKHN0YXJ0LCBpICsgMSkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGxvb2sgdXAganNvbiBkYXRhXG4gICAgICAgIGlmIChzdHIuY2hhckF0KCsraSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSB0aGlzLnRyeVBhcnNlKHN0ci5zdWJzdHIoaSkpO1xuICAgICAgICAgICAgaWYgKERlY29kZXIuaXNQYXlsb2FkVmFsaWQocC50eXBlLCBwYXlsb2FkKSkge1xuICAgICAgICAgICAgICAgIHAuZGF0YSA9IHBheWxvYWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIHBheWxvYWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxuICAgIHRyeVBhcnNlKHN0cikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2Uoc3RyLCB0aGlzLnJldml2ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3RhdGljIGlzUGF5bG9hZFZhbGlkKHR5cGUsIHBheWxvYWQpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuQ09OTkVDVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNPYmplY3QocGF5bG9hZCk7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuRElTQ09OTkVDVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF5bG9hZCA9PT0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkNPTk5FQ1RfRVJST1I6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBwYXlsb2FkID09PSBcInN0cmluZ1wiIHx8IGlzT2JqZWN0KHBheWxvYWQpO1xuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkVWRU5UOlxuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkJJTkFSWV9FVkVOVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gKEFycmF5LmlzQXJyYXkocGF5bG9hZCkgJiZcbiAgICAgICAgICAgICAgICAgICAgKHR5cGVvZiBwYXlsb2FkWzBdID09PSBcIm51bWJlclwiIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mIHBheWxvYWRbMF0gPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBSRVNFUlZFRF9FVkVOVFMuaW5kZXhPZihwYXlsb2FkWzBdKSA9PT0gLTEpKSk7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuQUNLOlxuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkJJTkFSWV9BQ0s6XG4gICAgICAgICAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkocGF5bG9hZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVhbGxvY2F0ZXMgYSBwYXJzZXIncyByZXNvdXJjZXNcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodGhpcy5yZWNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICB0aGlzLnJlY29uc3RydWN0b3IuZmluaXNoZWRSZWNvbnN0cnVjdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5yZWNvbnN0cnVjdG9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8qKlxuICogQSBtYW5hZ2VyIG9mIGEgYmluYXJ5IGV2ZW50J3MgJ2J1ZmZlciBzZXF1ZW5jZScuIFNob3VsZFxuICogYmUgY29uc3RydWN0ZWQgd2hlbmV2ZXIgYSBwYWNrZXQgb2YgdHlwZSBCSU5BUllfRVZFTlQgaXNcbiAqIGRlY29kZWQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBhY2tldFxuICogQHJldHVybiB7QmluYXJ5UmVjb25zdHJ1Y3Rvcn0gaW5pdGlhbGl6ZWQgcmVjb25zdHJ1Y3RvclxuICovXG5jbGFzcyBCaW5hcnlSZWNvbnN0cnVjdG9yIHtcbiAgICBjb25zdHJ1Y3RvcihwYWNrZXQpIHtcbiAgICAgICAgdGhpcy5wYWNrZXQgPSBwYWNrZXQ7XG4gICAgICAgIHRoaXMuYnVmZmVycyA9IFtdO1xuICAgICAgICB0aGlzLnJlY29uUGFjayA9IHBhY2tldDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGJlIGNhbGxlZCB3aGVuIGJpbmFyeSBkYXRhIHJlY2VpdmVkIGZyb20gY29ubmVjdGlvblxuICAgICAqIGFmdGVyIGEgQklOQVJZX0VWRU5UIHBhY2tldC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QnVmZmVyIHwgQXJyYXlCdWZmZXJ9IGJpbkRhdGEgLSB0aGUgcmF3IGJpbmFyeSBkYXRhIHJlY2VpdmVkXG4gICAgICogQHJldHVybiB7bnVsbCB8IE9iamVjdH0gcmV0dXJucyBudWxsIGlmIG1vcmUgYmluYXJ5IGRhdGEgaXMgZXhwZWN0ZWQgb3JcbiAgICAgKiAgIGEgcmVjb25zdHJ1Y3RlZCBwYWNrZXQgb2JqZWN0IGlmIGFsbCBidWZmZXJzIGhhdmUgYmVlbiByZWNlaXZlZC5cbiAgICAgKi9cbiAgICB0YWtlQmluYXJ5RGF0YShiaW5EYXRhKSB7XG4gICAgICAgIHRoaXMuYnVmZmVycy5wdXNoKGJpbkRhdGEpO1xuICAgICAgICBpZiAodGhpcy5idWZmZXJzLmxlbmd0aCA9PT0gdGhpcy5yZWNvblBhY2suYXR0YWNobWVudHMpIHtcbiAgICAgICAgICAgIC8vIGRvbmUgd2l0aCBidWZmZXIgbGlzdFxuICAgICAgICAgICAgY29uc3QgcGFja2V0ID0gcmVjb25zdHJ1Y3RQYWNrZXQodGhpcy5yZWNvblBhY2ssIHRoaXMuYnVmZmVycyk7XG4gICAgICAgICAgICB0aGlzLmZpbmlzaGVkUmVjb25zdHJ1Y3Rpb24oKTtcbiAgICAgICAgICAgIHJldHVybiBwYWNrZXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFucyB1cCBiaW5hcnkgcGFja2V0IHJlY29uc3RydWN0aW9uIHZhcmlhYmxlcy5cbiAgICAgKi9cbiAgICBmaW5pc2hlZFJlY29uc3RydWN0aW9uKCkge1xuICAgICAgICB0aGlzLnJlY29uUGFjayA9IG51bGw7XG4gICAgICAgIHRoaXMuYnVmZmVycyA9IFtdO1xuICAgIH1cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBvbihvYmosIGV2LCBmbikge1xuICAgIG9iai5vbihldiwgZm4pO1xuICAgIHJldHVybiBmdW5jdGlvbiBzdWJEZXN0cm95KCkge1xuICAgICAgICBvYmoub2ZmKGV2LCBmbik7XG4gICAgfTtcbn1cbiIsImltcG9ydCB7IFBhY2tldFR5cGUgfSBmcm9tIFwic29ja2V0LmlvLXBhcnNlclwiO1xuaW1wb3J0IHsgb24gfSBmcm9tIFwiLi9vbi5qc1wiO1xuaW1wb3J0IHsgRW1pdHRlciwgfSBmcm9tIFwiQHNvY2tldC5pby9jb21wb25lbnQtZW1pdHRlclwiO1xuLyoqXG4gKiBJbnRlcm5hbCBldmVudHMuXG4gKiBUaGVzZSBldmVudHMgY2FuJ3QgYmUgZW1pdHRlZCBieSB0aGUgdXNlci5cbiAqL1xuY29uc3QgUkVTRVJWRURfRVZFTlRTID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgY29ubmVjdDogMSxcbiAgICBjb25uZWN0X2Vycm9yOiAxLFxuICAgIGRpc2Nvbm5lY3Q6IDEsXG4gICAgZGlzY29ubmVjdGluZzogMSxcbiAgICAvLyBFdmVudEVtaXR0ZXIgcmVzZXJ2ZWQgZXZlbnRzOiBodHRwczovL25vZGVqcy5vcmcvYXBpL2V2ZW50cy5odG1sI2V2ZW50c19ldmVudF9uZXdsaXN0ZW5lclxuICAgIG5ld0xpc3RlbmVyOiAxLFxuICAgIHJlbW92ZUxpc3RlbmVyOiAxLFxufSk7XG4vKipcbiAqIEEgU29ja2V0IGlzIHRoZSBmdW5kYW1lbnRhbCBjbGFzcyBmb3IgaW50ZXJhY3Rpbmcgd2l0aCB0aGUgc2VydmVyLlxuICpcbiAqIEEgU29ja2V0IGJlbG9uZ3MgdG8gYSBjZXJ0YWluIE5hbWVzcGFjZSAoYnkgZGVmYXVsdCAvKSBhbmQgdXNlcyBhbiB1bmRlcmx5aW5nIHtAbGluayBNYW5hZ2VyfSB0byBjb21tdW5pY2F0ZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3Qgc29ja2V0ID0gaW8oKTtcbiAqXG4gKiBzb2NrZXQub24oXCJjb25uZWN0XCIsICgpID0+IHtcbiAqICAgY29uc29sZS5sb2coXCJjb25uZWN0ZWRcIik7XG4gKiB9KTtcbiAqXG4gKiAvLyBzZW5kIGFuIGV2ZW50IHRvIHRoZSBzZXJ2ZXJcbiAqIHNvY2tldC5lbWl0KFwiZm9vXCIsIFwiYmFyXCIpO1xuICpcbiAqIHNvY2tldC5vbihcImZvb2JhclwiLCAoKSA9PiB7XG4gKiAgIC8vIGFuIGV2ZW50IHdhcyByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXJcbiAqIH0pO1xuICpcbiAqIC8vIHVwb24gZGlzY29ubmVjdGlvblxuICogc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAocmVhc29uKSA9PiB7XG4gKiAgIGNvbnNvbGUubG9nKGBkaXNjb25uZWN0ZWQgZHVlIHRvICR7cmVhc29ufWApO1xuICogfSk7XG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXQgZXh0ZW5kcyBFbWl0dGVyIHtcbiAgICAvKipcbiAgICAgKiBgU29ja2V0YCBjb25zdHJ1Y3Rvci5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpbywgbnNwLCBvcHRzKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBzb2NrZXQgaXMgY3VycmVudGx5IGNvbm5lY3RlZCB0byB0aGUgc2VydmVyLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiBjb25zdCBzb2NrZXQgPSBpbygpO1xuICAgICAgICAgKlxuICAgICAgICAgKiBzb2NrZXQub24oXCJjb25uZWN0XCIsICgpID0+IHtcbiAgICAgICAgICogICBjb25zb2xlLmxvZyhzb2NrZXQuY29ubmVjdGVkKTsgLy8gdHJ1ZVxuICAgICAgICAgKiB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XG4gICAgICAgICAqICAgY29uc29sZS5sb2coc29ja2V0LmNvbm5lY3RlZCk7IC8vIGZhbHNlXG4gICAgICAgICAqIH0pO1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIGNvbm5lY3Rpb24gc3RhdGUgd2FzIHJlY292ZXJlZCBhZnRlciBhIHRlbXBvcmFyeSBkaXNjb25uZWN0aW9uLiBJbiB0aGF0IGNhc2UsIGFueSBtaXNzZWQgcGFja2V0cyB3aWxsXG4gICAgICAgICAqIGJlIHRyYW5zbWl0dGVkIGJ5IHRoZSBzZXJ2ZXIuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlY292ZXJlZCA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogQnVmZmVyIGZvciBwYWNrZXRzIHJlY2VpdmVkIGJlZm9yZSB0aGUgQ09OTkVDVCBwYWNrZXRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVjZWl2ZUJ1ZmZlciA9IFtdO1xuICAgICAgICAvKipcbiAgICAgICAgICogQnVmZmVyIGZvciBwYWNrZXRzIHRoYXQgd2lsbCBiZSBzZW50IG9uY2UgdGhlIHNvY2tldCBpcyBjb25uZWN0ZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2VuZEJ1ZmZlciA9IFtdO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHF1ZXVlIG9mIHBhY2tldHMgdG8gYmUgc2VudCB3aXRoIHJldHJ5IGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgICAgICpcbiAgICAgICAgICogUGFja2V0cyBhcmUgc2VudCBvbmUgYnkgb25lLCBlYWNoIHdhaXRpbmcgZm9yIHRoZSBzZXJ2ZXIgYWNrbm93bGVkZ2VtZW50LCBpbiBvcmRlciB0byBndWFyYW50ZWUgdGhlIGRlbGl2ZXJ5IG9yZGVyLlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fcXVldWUgPSBbXTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEEgc2VxdWVuY2UgdG8gZ2VuZXJhdGUgdGhlIElEIG9mIHRoZSB7QGxpbmsgUXVldWVkUGFja2V0fS5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3F1ZXVlU2VxID0gMDtcbiAgICAgICAgdGhpcy5pZHMgPSAwO1xuICAgICAgICB0aGlzLmFja3MgPSB7fTtcbiAgICAgICAgdGhpcy5mbGFncyA9IHt9O1xuICAgICAgICB0aGlzLmlvID0gaW87XG4gICAgICAgIHRoaXMubnNwID0gbnNwO1xuICAgICAgICBpZiAob3B0cyAmJiBvcHRzLmF1dGgpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0aCA9IG9wdHMuYXV0aDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0cyk7XG4gICAgICAgIGlmICh0aGlzLmlvLl9hdXRvQ29ubmVjdClcbiAgICAgICAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoZSBzb2NrZXQgaXMgY3VycmVudGx5IGRpc2Nvbm5lY3RlZFxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCBzb2NrZXQgPSBpbygpO1xuICAgICAqXG4gICAgICogc29ja2V0Lm9uKFwiY29ubmVjdFwiLCAoKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhzb2NrZXQuZGlzY29ubmVjdGVkKTsgLy8gZmFsc2VcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIHNvY2tldC5vbihcImRpc2Nvbm5lY3RcIiwgKCkgPT4ge1xuICAgICAqICAgY29uc29sZS5sb2coc29ja2V0LmRpc2Nvbm5lY3RlZCk7IC8vIHRydWVcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBnZXQgZGlzY29ubmVjdGVkKCkge1xuICAgICAgICByZXR1cm4gIXRoaXMuY29ubmVjdGVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gb3BlbiwgY2xvc2UgYW5kIHBhY2tldCBldmVudHNcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgc3ViRXZlbnRzKCkge1xuICAgICAgICBpZiAodGhpcy5zdWJzKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBpbyA9IHRoaXMuaW87XG4gICAgICAgIHRoaXMuc3VicyA9IFtcbiAgICAgICAgICAgIG9uKGlvLCBcIm9wZW5cIiwgdGhpcy5vbm9wZW4uYmluZCh0aGlzKSksXG4gICAgICAgICAgICBvbihpbywgXCJwYWNrZXRcIiwgdGhpcy5vbnBhY2tldC5iaW5kKHRoaXMpKSxcbiAgICAgICAgICAgIG9uKGlvLCBcImVycm9yXCIsIHRoaXMub25lcnJvci5iaW5kKHRoaXMpKSxcbiAgICAgICAgICAgIG9uKGlvLCBcImNsb3NlXCIsIHRoaXMub25jbG9zZS5iaW5kKHRoaXMpKSxcbiAgICAgICAgXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV2hldGhlciB0aGUgU29ja2V0IHdpbGwgdHJ5IHRvIHJlY29ubmVjdCB3aGVuIGl0cyBNYW5hZ2VyIGNvbm5lY3RzIG9yIHJlY29ubmVjdHMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IHNvY2tldCA9IGlvKCk7XG4gICAgICpcbiAgICAgKiBjb25zb2xlLmxvZyhzb2NrZXQuYWN0aXZlKTsgLy8gdHJ1ZVxuICAgICAqXG4gICAgICogc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAocmVhc29uKSA9PiB7XG4gICAgICogICBpZiAocmVhc29uID09PSBcImlvIHNlcnZlciBkaXNjb25uZWN0XCIpIHtcbiAgICAgKiAgICAgLy8gdGhlIGRpc2Nvbm5lY3Rpb24gd2FzIGluaXRpYXRlZCBieSB0aGUgc2VydmVyLCB5b3UgbmVlZCB0byBtYW51YWxseSByZWNvbm5lY3RcbiAgICAgKiAgICAgY29uc29sZS5sb2coc29ja2V0LmFjdGl2ZSk7IC8vIGZhbHNlXG4gICAgICogICB9XG4gICAgICogICAvLyBlbHNlIHRoZSBzb2NrZXQgd2lsbCBhdXRvbWF0aWNhbGx5IHRyeSB0byByZWNvbm5lY3RcbiAgICAgKiAgIGNvbnNvbGUubG9nKHNvY2tldC5hY3RpdmUpOyAvLyB0cnVlXG4gICAgICogfSk7XG4gICAgICovXG4gICAgZ2V0IGFjdGl2ZSgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5zdWJzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBcIk9wZW5zXCIgdGhlIHNvY2tldC5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc3Qgc29ja2V0ID0gaW8oe1xuICAgICAqICAgYXV0b0Nvbm5lY3Q6IGZhbHNlXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBzb2NrZXQuY29ubmVjdCgpO1xuICAgICAqL1xuICAgIGNvbm5lY3QoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbm5lY3RlZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB0aGlzLnN1YkV2ZW50cygpO1xuICAgICAgICBpZiAoIXRoaXMuaW9bXCJfcmVjb25uZWN0aW5nXCJdKVxuICAgICAgICAgICAgdGhpcy5pby5vcGVuKCk7IC8vIGVuc3VyZSBvcGVuXG4gICAgICAgIGlmIChcIm9wZW5cIiA9PT0gdGhpcy5pby5fcmVhZHlTdGF0ZSlcbiAgICAgICAgICAgIHRoaXMub25vcGVuKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIGNvbm5lY3QoKX0uXG4gICAgICovXG4gICAgb3BlbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZW5kcyBhIGBtZXNzYWdlYCBldmVudC5cbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIG1pbWljcyB0aGUgV2ViU29ja2V0LnNlbmQoKSBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9XZWJTb2NrZXQvc2VuZFxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBzb2NrZXQuc2VuZChcImhlbGxvXCIpO1xuICAgICAqXG4gICAgICogLy8gdGhpcyBpcyBlcXVpdmFsZW50IHRvXG4gICAgICogc29ja2V0LmVtaXQoXCJtZXNzYWdlXCIsIFwiaGVsbG9cIik7XG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHNlbGZcbiAgICAgKi9cbiAgICBzZW5kKC4uLmFyZ3MpIHtcbiAgICAgICAgYXJncy51bnNoaWZ0KFwibWVzc2FnZVwiKTtcbiAgICAgICAgdGhpcy5lbWl0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgYGVtaXRgLlxuICAgICAqIElmIHRoZSBldmVudCBpcyBpbiBgZXZlbnRzYCwgaXQncyBlbWl0dGVkIG5vcm1hbGx5LlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBzb2NrZXQuZW1pdChcImhlbGxvXCIsIFwid29ybGRcIik7XG4gICAgICpcbiAgICAgKiAvLyBhbGwgc2VyaWFsaXphYmxlIGRhdGFzdHJ1Y3R1cmVzIGFyZSBzdXBwb3J0ZWQgKG5vIG5lZWQgdG8gY2FsbCBKU09OLnN0cmluZ2lmeSlcbiAgICAgKiBzb2NrZXQuZW1pdChcImhlbGxvXCIsIDEsIFwiMlwiLCB7IDM6IFtcIjRcIl0sIDU6IFVpbnQ4QXJyYXkuZnJvbShbNl0pIH0pO1xuICAgICAqXG4gICAgICogLy8gd2l0aCBhbiBhY2tub3dsZWRnZW1lbnQgZnJvbSB0aGUgc2VydmVyXG4gICAgICogc29ja2V0LmVtaXQoXCJoZWxsb1wiLCBcIndvcmxkXCIsICh2YWwpID0+IHtcbiAgICAgKiAgIC8vIC4uLlxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogQHJldHVybiBzZWxmXG4gICAgICovXG4gICAgZW1pdChldiwgLi4uYXJncykge1xuICAgICAgICBpZiAoUkVTRVJWRURfRVZFTlRTLmhhc093blByb3BlcnR5KGV2KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcIicgKyBldi50b1N0cmluZygpICsgJ1wiIGlzIGEgcmVzZXJ2ZWQgZXZlbnQgbmFtZScpO1xuICAgICAgICB9XG4gICAgICAgIGFyZ3MudW5zaGlmdChldik7XG4gICAgICAgIGlmICh0aGlzLl9vcHRzLnJldHJpZXMgJiYgIXRoaXMuZmxhZ3MuZnJvbVF1ZXVlICYmICF0aGlzLmZsYWdzLnZvbGF0aWxlKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRUb1F1ZXVlKGFyZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFja2V0ID0ge1xuICAgICAgICAgICAgdHlwZTogUGFja2V0VHlwZS5FVkVOVCxcbiAgICAgICAgICAgIGRhdGE6IGFyZ3MsXG4gICAgICAgIH07XG4gICAgICAgIHBhY2tldC5vcHRpb25zID0ge307XG4gICAgICAgIHBhY2tldC5vcHRpb25zLmNvbXByZXNzID0gdGhpcy5mbGFncy5jb21wcmVzcyAhPT0gZmFsc2U7XG4gICAgICAgIC8vIGV2ZW50IGFjayBjYWxsYmFja1xuICAgICAgICBpZiAoXCJmdW5jdGlvblwiID09PSB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdKSB7XG4gICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMuaWRzKys7XG4gICAgICAgICAgICBjb25zdCBhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdGhpcy5fcmVnaXN0ZXJBY2tDYWxsYmFjayhpZCwgYWNrKTtcbiAgICAgICAgICAgIHBhY2tldC5pZCA9IGlkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGlzVHJhbnNwb3J0V3JpdGFibGUgPSB0aGlzLmlvLmVuZ2luZSAmJlxuICAgICAgICAgICAgdGhpcy5pby5lbmdpbmUudHJhbnNwb3J0ICYmXG4gICAgICAgICAgICB0aGlzLmlvLmVuZ2luZS50cmFuc3BvcnQud3JpdGFibGU7XG4gICAgICAgIGNvbnN0IGRpc2NhcmRQYWNrZXQgPSB0aGlzLmZsYWdzLnZvbGF0aWxlICYmICghaXNUcmFuc3BvcnRXcml0YWJsZSB8fCAhdGhpcy5jb25uZWN0ZWQpO1xuICAgICAgICBpZiAoZGlzY2FyZFBhY2tldCkge1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLm5vdGlmeU91dGdvaW5nTGlzdGVuZXJzKHBhY2tldCk7XG4gICAgICAgICAgICB0aGlzLnBhY2tldChwYWNrZXQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZW5kQnVmZmVyLnB1c2gocGFja2V0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZsYWdzID0ge307XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZWdpc3RlckFja0NhbGxiYWNrKGlkLCBhY2spIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBjb25zdCB0aW1lb3V0ID0gKF9hID0gdGhpcy5mbGFncy50aW1lb3V0KSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiB0aGlzLl9vcHRzLmFja1RpbWVvdXQ7XG4gICAgICAgIGlmICh0aW1lb3V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYWNrc1tpZF0gPSBhY2s7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBjb25zdCB0aW1lciA9IHRoaXMuaW8uc2V0VGltZW91dEZuKCgpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmFja3NbaWRdO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNlbmRCdWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZW5kQnVmZmVyW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRCdWZmZXIuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjay5jYWxsKHRoaXMsIG5ldyBFcnJvcihcIm9wZXJhdGlvbiBoYXMgdGltZWQgb3V0XCIpKTtcbiAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgIHRoaXMuYWNrc1tpZF0gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgdGhpcy5pby5jbGVhclRpbWVvdXRGbih0aW1lcik7XG4gICAgICAgICAgICBhY2suYXBwbHkodGhpcywgW251bGwsIC4uLmFyZ3NdKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW1pdHMgYW4gZXZlbnQgYW5kIHdhaXRzIGZvciBhbiBhY2tub3dsZWRnZW1lbnRcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gd2l0aG91dCB0aW1lb3V0XG4gICAgICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzb2NrZXQuZW1pdFdpdGhBY2soXCJoZWxsb1wiLCBcIndvcmxkXCIpO1xuICAgICAqXG4gICAgICogLy8gd2l0aCBhIHNwZWNpZmljIHRpbWVvdXRcbiAgICAgKiB0cnkge1xuICAgICAqICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzb2NrZXQudGltZW91dCgxMDAwKS5lbWl0V2l0aEFjayhcImhlbGxvXCIsIFwid29ybGRcIik7XG4gICAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAgICogICAvLyB0aGUgc2VydmVyIGRpZCBub3QgYWNrbm93bGVkZ2UgdGhlIGV2ZW50IGluIHRoZSBnaXZlbiBkZWxheVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYSBQcm9taXNlIHRoYXQgd2lsbCBiZSBmdWxmaWxsZWQgd2hlbiB0aGUgc2VydmVyIGFja25vd2xlZGdlcyB0aGUgZXZlbnRcbiAgICAgKi9cbiAgICBlbWl0V2l0aEFjayhldiwgLi4uYXJncykge1xuICAgICAgICAvLyB0aGUgdGltZW91dCBmbGFnIGlzIG9wdGlvbmFsXG4gICAgICAgIGNvbnN0IHdpdGhFcnIgPSB0aGlzLmZsYWdzLnRpbWVvdXQgIT09IHVuZGVmaW5lZCB8fCB0aGlzLl9vcHRzLmFja1RpbWVvdXQgIT09IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGFyZ3MucHVzaCgoYXJnMSwgYXJnMikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh3aXRoRXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmcxID8gcmVqZWN0KGFyZzEpIDogcmVzb2x2ZShhcmcyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKGFyZzEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5lbWl0KGV2LCAuLi5hcmdzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZCB0aGUgcGFja2V0IHRvIHRoZSBxdWV1ZS5cbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2FkZFRvUXVldWUoYXJncykge1xuICAgICAgICBsZXQgYWNrO1xuICAgICAgICBpZiAodHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhY2tldCA9IHtcbiAgICAgICAgICAgIGlkOiB0aGlzLl9xdWV1ZVNlcSsrLFxuICAgICAgICAgICAgdHJ5Q291bnQ6IDAsXG4gICAgICAgICAgICBwZW5kaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGFyZ3MsXG4gICAgICAgICAgICBmbGFnczogT2JqZWN0LmFzc2lnbih7IGZyb21RdWV1ZTogdHJ1ZSB9LCB0aGlzLmZsYWdzKSxcbiAgICAgICAgfTtcbiAgICAgICAgYXJncy5wdXNoKChlcnIsIC4uLnJlc3BvbnNlQXJncykgPT4ge1xuICAgICAgICAgICAgaWYgKHBhY2tldCAhPT0gdGhpcy5fcXVldWVbMF0pIHtcbiAgICAgICAgICAgICAgICAvLyB0aGUgcGFja2V0IGhhcyBhbHJlYWR5IGJlZW4gYWNrbm93bGVkZ2VkXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaGFzRXJyb3IgPSBlcnIgIT09IG51bGw7XG4gICAgICAgICAgICBpZiAoaGFzRXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFja2V0LnRyeUNvdW50ID4gdGhpcy5fb3B0cy5yZXRyaWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3F1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBpZiAoYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjayhudWxsLCAuLi5yZXNwb25zZUFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhY2tldC5wZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZHJhaW5RdWV1ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fcXVldWUucHVzaChwYWNrZXQpO1xuICAgICAgICB0aGlzLl9kcmFpblF1ZXVlKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNlbmQgdGhlIGZpcnN0IHBhY2tldCBvZiB0aGUgcXVldWUsIGFuZCB3YWl0IGZvciBhbiBhY2tub3dsZWRnZW1lbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSBmb3JjZSAtIHdoZXRoZXIgdG8gcmVzZW5kIGEgcGFja2V0IHRoYXQgaGFzIG5vdCBiZWVuIGFja25vd2xlZGdlZCB5ZXRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2RyYWluUXVldWUoZm9yY2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAoIXRoaXMuY29ubmVjdGVkIHx8IHRoaXMuX3F1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhY2tldCA9IHRoaXMuX3F1ZXVlWzBdO1xuICAgICAgICBpZiAocGFja2V0LnBlbmRpbmcgJiYgIWZvcmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcGFja2V0LnBlbmRpbmcgPSB0cnVlO1xuICAgICAgICBwYWNrZXQudHJ5Q291bnQrKztcbiAgICAgICAgdGhpcy5mbGFncyA9IHBhY2tldC5mbGFncztcbiAgICAgICAgdGhpcy5lbWl0LmFwcGx5KHRoaXMsIHBhY2tldC5hcmdzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2VuZHMgYSBwYWNrZXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFja2V0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBwYWNrZXQocGFja2V0KSB7XG4gICAgICAgIHBhY2tldC5uc3AgPSB0aGlzLm5zcDtcbiAgICAgICAgdGhpcy5pby5fcGFja2V0KHBhY2tldCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIGVuZ2luZSBgb3BlbmAuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9ub3BlbigpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmF1dGggPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aGlzLmF1dGgoKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZW5kQ29ubmVjdFBhY2tldChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2VuZENvbm5lY3RQYWNrZXQodGhpcy5hdXRoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZW5kcyBhIENPTk5FQ1QgcGFja2V0IHRvIGluaXRpYXRlIHRoZSBTb2NrZXQuSU8gc2Vzc2lvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc2VuZENvbm5lY3RQYWNrZXQoZGF0YSkge1xuICAgICAgICB0aGlzLnBhY2tldCh7XG4gICAgICAgICAgICB0eXBlOiBQYWNrZXRUeXBlLkNPTk5FQ1QsXG4gICAgICAgICAgICBkYXRhOiB0aGlzLl9waWRcbiAgICAgICAgICAgICAgICA/IE9iamVjdC5hc3NpZ24oeyBwaWQ6IHRoaXMuX3BpZCwgb2Zmc2V0OiB0aGlzLl9sYXN0T2Zmc2V0IH0sIGRhdGEpXG4gICAgICAgICAgICAgICAgOiBkYXRhLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gZW5naW5lIG9yIG1hbmFnZXIgYGVycm9yYC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBlcnJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uZXJyb3IoZXJyKSB7XG4gICAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwiY29ubmVjdF9lcnJvclwiLCBlcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIGVuZ2luZSBgY2xvc2VgLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlYXNvblxuICAgICAqIEBwYXJhbSBkZXNjcmlwdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25jbG9zZShyZWFzb24sIGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmlkO1xuICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImRpc2Nvbm5lY3RcIiwgcmVhc29uLCBkZXNjcmlwdGlvbik7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aXRoIHNvY2tldCBwYWNrZXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFja2V0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbnBhY2tldChwYWNrZXQpIHtcbiAgICAgICAgY29uc3Qgc2FtZU5hbWVzcGFjZSA9IHBhY2tldC5uc3AgPT09IHRoaXMubnNwO1xuICAgICAgICBpZiAoIXNhbWVOYW1lc3BhY2UpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHN3aXRjaCAocGFja2V0LnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgUGFja2V0VHlwZS5DT05ORUNUOlxuICAgICAgICAgICAgICAgIGlmIChwYWNrZXQuZGF0YSAmJiBwYWNrZXQuZGF0YS5zaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbmNvbm5lY3QocGFja2V0LmRhdGEuc2lkLCBwYWNrZXQuZGF0YS5waWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJjb25uZWN0X2Vycm9yXCIsIG5ldyBFcnJvcihcIkl0IHNlZW1zIHlvdSBhcmUgdHJ5aW5nIHRvIHJlYWNoIGEgU29ja2V0LklPIHNlcnZlciBpbiB2Mi54IHdpdGggYSB2My54IGNsaWVudCwgYnV0IHRoZXkgYXJlIG5vdCBjb21wYXRpYmxlIChtb3JlIGluZm9ybWF0aW9uIGhlcmU6IGh0dHBzOi8vc29ja2V0LmlvL2RvY3MvdjMvbWlncmF0aW5nLWZyb20tMi14LXRvLTMtMC8pXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuRVZFTlQ6XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuQklOQVJZX0VWRU5UOlxuICAgICAgICAgICAgICAgIHRoaXMub25ldmVudChwYWNrZXQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkFDSzpcbiAgICAgICAgICAgIGNhc2UgUGFja2V0VHlwZS5CSU5BUllfQUNLOlxuICAgICAgICAgICAgICAgIHRoaXMub25hY2socGFja2V0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgUGFja2V0VHlwZS5ESVNDT05ORUNUOlxuICAgICAgICAgICAgICAgIHRoaXMub25kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuQ09OTkVDVF9FUlJPUjpcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IocGFja2V0LmRhdGEubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgIGVyci5kYXRhID0gcGFja2V0LmRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImNvbm5lY3RfZXJyb3JcIiwgZXJyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBhIHNlcnZlciBldmVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYWNrZXRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uZXZlbnQocGFja2V0KSB7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBwYWNrZXQuZGF0YSB8fCBbXTtcbiAgICAgICAgaWYgKG51bGwgIT0gcGFja2V0LmlkKSB7XG4gICAgICAgICAgICBhcmdzLnB1c2godGhpcy5hY2socGFja2V0LmlkKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXRFdmVudChhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVjZWl2ZUJ1ZmZlci5wdXNoKE9iamVjdC5mcmVlemUoYXJncykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVtaXRFdmVudChhcmdzKSB7XG4gICAgICAgIGlmICh0aGlzLl9hbnlMaXN0ZW5lcnMgJiYgdGhpcy5fYW55TGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gdGhpcy5fYW55TGlzdGVuZXJzLnNsaWNlKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN1cGVyLmVtaXQuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIGlmICh0aGlzLl9waWQgJiYgYXJncy5sZW5ndGggJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdGhpcy5fbGFzdE9mZnNldCA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9kdWNlcyBhbiBhY2sgY2FsbGJhY2sgdG8gZW1pdCB3aXRoIGFuIGV2ZW50LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBhY2soaWQpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGxldCBzZW50ID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAgICAgLy8gcHJldmVudCBkb3VibGUgY2FsbGJhY2tzXG4gICAgICAgICAgICBpZiAoc2VudClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBzZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgIHNlbGYucGFja2V0KHtcbiAgICAgICAgICAgICAgICB0eXBlOiBQYWNrZXRUeXBlLkFDSyxcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgZGF0YTogYXJncyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBhIHNlcnZlciBhY2tub3dsZWdlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYWNrZXRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uYWNrKHBhY2tldCkge1xuICAgICAgICBjb25zdCBhY2sgPSB0aGlzLmFja3NbcGFja2V0LmlkXTtcbiAgICAgICAgaWYgKFwiZnVuY3Rpb25cIiA9PT0gdHlwZW9mIGFjaykge1xuICAgICAgICAgICAgYWNrLmFwcGx5KHRoaXMsIHBhY2tldC5kYXRhKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmFja3NbcGFja2V0LmlkXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBzZXJ2ZXIgY29ubmVjdC5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25jb25uZWN0KGlkLCBwaWQpIHtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLnJlY292ZXJlZCA9IHBpZCAmJiB0aGlzLl9waWQgPT09IHBpZDtcbiAgICAgICAgdGhpcy5fcGlkID0gcGlkOyAvLyBkZWZpbmVkIG9ubHkgaWYgY29ubmVjdGlvbiBzdGF0ZSByZWNvdmVyeSBpcyBlbmFibGVkXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lbWl0QnVmZmVyZWQoKTtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJjb25uZWN0XCIpO1xuICAgICAgICB0aGlzLl9kcmFpblF1ZXVlKHRydWUpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbWl0IGJ1ZmZlcmVkIGV2ZW50cyAocmVjZWl2ZWQgYW5kIGVtaXR0ZWQpLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBlbWl0QnVmZmVyZWQoKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZUJ1ZmZlci5mb3JFYWNoKChhcmdzKSA9PiB0aGlzLmVtaXRFdmVudChhcmdzKSk7XG4gICAgICAgIHRoaXMucmVjZWl2ZUJ1ZmZlciA9IFtdO1xuICAgICAgICB0aGlzLnNlbmRCdWZmZXIuZm9yRWFjaCgocGFja2V0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm5vdGlmeU91dGdvaW5nTGlzdGVuZXJzKHBhY2tldCk7XG4gICAgICAgICAgICB0aGlzLnBhY2tldChwYWNrZXQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zZW5kQnVmZmVyID0gW107XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIHNlcnZlciBkaXNjb25uZWN0LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbmRpc2Nvbm5lY3QoKSB7XG4gICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICB0aGlzLm9uY2xvc2UoXCJpbyBzZXJ2ZXIgZGlzY29ubmVjdFwiKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gZm9yY2VkIGNsaWVudC9zZXJ2ZXIgc2lkZSBkaXNjb25uZWN0aW9ucyxcbiAgICAgKiB0aGlzIG1ldGhvZCBlbnN1cmVzIHRoZSBtYW5hZ2VyIHN0b3BzIHRyYWNraW5nIHVzIGFuZFxuICAgICAqIHRoYXQgcmVjb25uZWN0aW9ucyBkb24ndCBnZXQgdHJpZ2dlcmVkIGZvciB0aGlzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodGhpcy5zdWJzKSB7XG4gICAgICAgICAgICAvLyBjbGVhbiBzdWJzY3JpcHRpb25zIHRvIGF2b2lkIHJlY29ubmVjdGlvbnNcbiAgICAgICAgICAgIHRoaXMuc3Vicy5mb3JFYWNoKChzdWJEZXN0cm95KSA9PiBzdWJEZXN0cm95KCkpO1xuICAgICAgICAgICAgdGhpcy5zdWJzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW9bXCJfZGVzdHJveVwiXSh0aGlzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGlzY29ubmVjdHMgdGhlIHNvY2tldCBtYW51YWxseS4gSW4gdGhhdCBjYXNlLCB0aGUgc29ja2V0IHdpbGwgbm90IHRyeSB0byByZWNvbm5lY3QuXG4gICAgICpcbiAgICAgKiBJZiB0aGlzIGlzIHRoZSBsYXN0IGFjdGl2ZSBTb2NrZXQgaW5zdGFuY2Ugb2YgdGhlIHtAbGluayBNYW5hZ2VyfSwgdGhlIGxvdy1sZXZlbCBjb25uZWN0aW9uIHdpbGwgYmUgY2xvc2VkLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCBzb2NrZXQgPSBpbygpO1xuICAgICAqXG4gICAgICogc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAocmVhc29uKSA9PiB7XG4gICAgICogICAvLyBjb25zb2xlLmxvZyhyZWFzb24pOyBwcmludHMgXCJpbyBjbGllbnQgZGlzY29ubmVjdFwiXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBzb2NrZXQuZGlzY29ubmVjdCgpO1xuICAgICAqXG4gICAgICogQHJldHVybiBzZWxmXG4gICAgICovXG4gICAgZGlzY29ubmVjdCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLnBhY2tldCh7IHR5cGU6IFBhY2tldFR5cGUuRElTQ09OTkVDVCB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyByZW1vdmUgc29ja2V0IGZyb20gcG9vbFxuICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAvLyBmaXJlIGV2ZW50c1xuICAgICAgICAgICAgdGhpcy5vbmNsb3NlKFwiaW8gY2xpZW50IGRpc2Nvbm5lY3RcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciB7QGxpbmsgZGlzY29ubmVjdCgpfS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gc2VsZlxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGNvbXByZXNzIGZsYWcuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHNvY2tldC5jb21wcmVzcyhmYWxzZSkuZW1pdChcImhlbGxvXCIpO1xuICAgICAqXG4gICAgICogQHBhcmFtIGNvbXByZXNzIC0gaWYgYHRydWVgLCBjb21wcmVzc2VzIHRoZSBzZW5kaW5nIGRhdGFcbiAgICAgKiBAcmV0dXJuIHNlbGZcbiAgICAgKi9cbiAgICBjb21wcmVzcyhjb21wcmVzcykge1xuICAgICAgICB0aGlzLmZsYWdzLmNvbXByZXNzID0gY29tcHJlc3M7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbW9kaWZpZXIgZm9yIGEgc3Vic2VxdWVudCBldmVudCBlbWlzc2lvbiB0aGF0IHRoZSBldmVudCBtZXNzYWdlIHdpbGwgYmUgZHJvcHBlZCB3aGVuIHRoaXMgc29ja2V0IGlzIG5vdFxuICAgICAqIHJlYWR5IHRvIHNlbmQgbWVzc2FnZXMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHNvY2tldC52b2xhdGlsZS5lbWl0KFwiaGVsbG9cIik7IC8vIHRoZSBzZXJ2ZXIgbWF5IG9yIG1heSBub3QgcmVjZWl2ZSBpdFxuICAgICAqXG4gICAgICogQHJldHVybnMgc2VsZlxuICAgICAqL1xuICAgIGdldCB2b2xhdGlsZSgpIHtcbiAgICAgICAgdGhpcy5mbGFncy52b2xhdGlsZSA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbW9kaWZpZXIgZm9yIGEgc3Vic2VxdWVudCBldmVudCBlbWlzc2lvbiB0aGF0IHRoZSBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCB3aXRoIGFuIGVycm9yIHdoZW4gdGhlXG4gICAgICogZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgd2l0aG91dCBhbiBhY2tub3dsZWRnZW1lbnQgZnJvbSB0aGUgc2VydmVyOlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBzb2NrZXQudGltZW91dCg1MDAwKS5lbWl0KFwibXktZXZlbnRcIiwgKGVycikgPT4ge1xuICAgICAqICAgaWYgKGVycikge1xuICAgICAqICAgICAvLyB0aGUgc2VydmVyIGRpZCBub3QgYWNrbm93bGVkZ2UgdGhlIGV2ZW50IGluIHRoZSBnaXZlbiBkZWxheVxuICAgICAqICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogQHJldHVybnMgc2VsZlxuICAgICAqL1xuICAgIHRpbWVvdXQodGltZW91dCkge1xuICAgICAgICB0aGlzLmZsYWdzLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBmaXJlZCB3aGVuIGFueSBldmVudCBpcyBlbWl0dGVkLiBUaGUgZXZlbnQgbmFtZSBpcyBwYXNzZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZVxuICAgICAqIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBzb2NrZXQub25BbnkoKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhgZ290ICR7ZXZlbnR9YCk7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKi9cbiAgICBvbkFueShsaXN0ZW5lcikge1xuICAgICAgICB0aGlzLl9hbnlMaXN0ZW5lcnMgPSB0aGlzLl9hbnlMaXN0ZW5lcnMgfHwgW107XG4gICAgICAgIHRoaXMuX2FueUxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgZmlyZWQgd2hlbiBhbnkgZXZlbnQgaXMgZW1pdHRlZC4gVGhlIGV2ZW50IG5hbWUgaXMgcGFzc2VkIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGVcbiAgICAgKiBjYWxsYmFjay4gVGhlIGxpc3RlbmVyIGlzIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpc3RlbmVycyBhcnJheS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogc29ja2V0LnByZXBlbmRBbnkoKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhgZ290IGV2ZW50ICR7ZXZlbnR9YCk7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKi9cbiAgICBwcmVwZW5kQW55KGxpc3RlbmVyKSB7XG4gICAgICAgIHRoaXMuX2FueUxpc3RlbmVycyA9IHRoaXMuX2FueUxpc3RlbmVycyB8fCBbXTtcbiAgICAgICAgdGhpcy5fYW55TGlzdGVuZXJzLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGZpcmVkIHdoZW4gYW55IGV2ZW50IGlzIGVtaXR0ZWQuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IGNhdGNoQWxsTGlzdGVuZXIgPSAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGBnb3QgZXZlbnQgJHtldmVudH1gKTtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBzb2NrZXQub25BbnkoY2F0Y2hBbGxMaXN0ZW5lcik7XG4gICAgICpcbiAgICAgKiAvLyByZW1vdmUgYSBzcGVjaWZpYyBsaXN0ZW5lclxuICAgICAqIHNvY2tldC5vZmZBbnkoY2F0Y2hBbGxMaXN0ZW5lcik7XG4gICAgICpcbiAgICAgKiAvLyBvciByZW1vdmUgYWxsIGxpc3RlbmVyc1xuICAgICAqIHNvY2tldC5vZmZBbnkoKTtcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqL1xuICAgIG9mZkFueShsaXN0ZW5lcikge1xuICAgICAgICBpZiAoIXRoaXMuX2FueUxpc3RlbmVycykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSB0aGlzLl9hbnlMaXN0ZW5lcnM7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lciA9PT0gbGlzdGVuZXJzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2FueUxpc3RlbmVycyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGxpc3RlbmVycyB0aGF0IGFyZSBsaXN0ZW5pbmcgZm9yIGFueSBldmVudCB0aGF0IGlzIHNwZWNpZmllZC4gVGhpcyBhcnJheSBjYW4gYmUgbWFuaXB1bGF0ZWQsXG4gICAgICogZS5nLiB0byByZW1vdmUgbGlzdGVuZXJzLlxuICAgICAqL1xuICAgIGxpc3RlbmVyc0FueSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FueUxpc3RlbmVycyB8fCBbXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBmaXJlZCB3aGVuIGFueSBldmVudCBpcyBlbWl0dGVkLiBUaGUgZXZlbnQgbmFtZSBpcyBwYXNzZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZVxuICAgICAqIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogTm90ZTogYWNrbm93bGVkZ2VtZW50cyBzZW50IHRvIHRoZSBzZXJ2ZXIgYXJlIG5vdCBpbmNsdWRlZC5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogc29ja2V0Lm9uQW55T3V0Z29pbmcoKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhgc2VudCBldmVudCAke2V2ZW50fWApO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICovXG4gICAgb25BbnlPdXRnb2luZyhsaXN0ZW5lcikge1xuICAgICAgICB0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycyA9IHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzIHx8IFtdO1xuICAgICAgICB0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgZmlyZWQgd2hlbiBhbnkgZXZlbnQgaXMgZW1pdHRlZC4gVGhlIGV2ZW50IG5hbWUgaXMgcGFzc2VkIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGVcbiAgICAgKiBjYWxsYmFjay4gVGhlIGxpc3RlbmVyIGlzIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpc3RlbmVycyBhcnJheS5cbiAgICAgKlxuICAgICAqIE5vdGU6IGFja25vd2xlZGdlbWVudHMgc2VudCB0byB0aGUgc2VydmVyIGFyZSBub3QgaW5jbHVkZWQuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHNvY2tldC5wcmVwZW5kQW55T3V0Z29pbmcoKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhgc2VudCBldmVudCAke2V2ZW50fWApO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICovXG4gICAgcHJlcGVuZEFueU91dGdvaW5nKGxpc3RlbmVyKSB7XG4gICAgICAgIHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzID0gdGhpcy5fYW55T3V0Z29pbmdMaXN0ZW5lcnMgfHwgW107XG4gICAgICAgIHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGZpcmVkIHdoZW4gYW55IGV2ZW50IGlzIGVtaXR0ZWQuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IGNhdGNoQWxsTGlzdGVuZXIgPSAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGBzZW50IGV2ZW50ICR7ZXZlbnR9YCk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogc29ja2V0Lm9uQW55T3V0Z29pbmcoY2F0Y2hBbGxMaXN0ZW5lcik7XG4gICAgICpcbiAgICAgKiAvLyByZW1vdmUgYSBzcGVjaWZpYyBsaXN0ZW5lclxuICAgICAqIHNvY2tldC5vZmZBbnlPdXRnb2luZyhjYXRjaEFsbExpc3RlbmVyKTtcbiAgICAgKlxuICAgICAqIC8vIG9yIHJlbW92ZSBhbGwgbGlzdGVuZXJzXG4gICAgICogc29ja2V0Lm9mZkFueU91dGdvaW5nKCk7XG4gICAgICpcbiAgICAgKiBAcGFyYW0gW2xpc3RlbmVyXSAtIHRoZSBjYXRjaC1hbGwgbGlzdGVuZXIgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG9mZkFueU91dGdvaW5nKGxpc3RlbmVyKSB7XG4gICAgICAgIGlmICghdGhpcy5fYW55T3V0Z29pbmdMaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsaXN0ZW5lcikge1xuICAgICAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gdGhpcy5fYW55T3V0Z29pbmdMaXN0ZW5lcnM7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lciA9PT0gbGlzdGVuZXJzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIHRoYXQgYXJlIGxpc3RlbmluZyBmb3IgYW55IGV2ZW50IHRoYXQgaXMgc3BlY2lmaWVkLiBUaGlzIGFycmF5IGNhbiBiZSBtYW5pcHVsYXRlZCxcbiAgICAgKiBlLmcuIHRvIHJlbW92ZSBsaXN0ZW5lcnMuXG4gICAgICovXG4gICAgbGlzdGVuZXJzQW55T3V0Z29pbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycyB8fCBbXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTm90aWZ5IHRoZSBsaXN0ZW5lcnMgZm9yIGVhY2ggcGFja2V0IHNlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYWNrZXRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgbm90aWZ5T3V0Z29pbmdMaXN0ZW5lcnMocGFja2V0KSB7XG4gICAgICAgIGlmICh0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycyAmJiB0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RlbmVycyA9IHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzLnNsaWNlKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIHBhY2tldC5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qKlxuICogSW5pdGlhbGl6ZSBiYWNrb2ZmIHRpbWVyIHdpdGggYG9wdHNgLlxuICpcbiAqIC0gYG1pbmAgaW5pdGlhbCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyBbMTAwXVxuICogLSBgbWF4YCBtYXggdGltZW91dCBbMTAwMDBdXG4gKiAtIGBqaXR0ZXJgIFswXVxuICogLSBgZmFjdG9yYCBbMl1cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0c1xuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEJhY2tvZmYob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIHRoaXMubXMgPSBvcHRzLm1pbiB8fCAxMDA7XG4gICAgdGhpcy5tYXggPSBvcHRzLm1heCB8fCAxMDAwMDtcbiAgICB0aGlzLmZhY3RvciA9IG9wdHMuZmFjdG9yIHx8IDI7XG4gICAgdGhpcy5qaXR0ZXIgPSBvcHRzLmppdHRlciA+IDAgJiYgb3B0cy5qaXR0ZXIgPD0gMSA/IG9wdHMuaml0dGVyIDogMDtcbiAgICB0aGlzLmF0dGVtcHRzID0gMDtcbn1cbi8qKlxuICogUmV0dXJuIHRoZSBiYWNrb2ZmIGR1cmF0aW9uLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkJhY2tvZmYucHJvdG90eXBlLmR1cmF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBtcyA9IHRoaXMubXMgKiBNYXRoLnBvdyh0aGlzLmZhY3RvciwgdGhpcy5hdHRlbXB0cysrKTtcbiAgICBpZiAodGhpcy5qaXR0ZXIpIHtcbiAgICAgICAgdmFyIHJhbmQgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICB2YXIgZGV2aWF0aW9uID0gTWF0aC5mbG9vcihyYW5kICogdGhpcy5qaXR0ZXIgKiBtcyk7XG4gICAgICAgIG1zID0gKE1hdGguZmxvb3IocmFuZCAqIDEwKSAmIDEpID09IDAgPyBtcyAtIGRldmlhdGlvbiA6IG1zICsgZGV2aWF0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gTWF0aC5taW4obXMsIHRoaXMubWF4KSB8IDA7XG59O1xuLyoqXG4gKiBSZXNldCB0aGUgbnVtYmVyIG9mIGF0dGVtcHRzLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkJhY2tvZmYucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXR0ZW1wdHMgPSAwO1xufTtcbi8qKlxuICogU2V0IHRoZSBtaW5pbXVtIGR1cmF0aW9uXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuQmFja29mZi5wcm90b3R5cGUuc2V0TWluID0gZnVuY3Rpb24gKG1pbikge1xuICAgIHRoaXMubXMgPSBtaW47XG59O1xuLyoqXG4gKiBTZXQgdGhlIG1heGltdW0gZHVyYXRpb25cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5CYWNrb2ZmLnByb3RvdHlwZS5zZXRNYXggPSBmdW5jdGlvbiAobWF4KSB7XG4gICAgdGhpcy5tYXggPSBtYXg7XG59O1xuLyoqXG4gKiBTZXQgdGhlIGppdHRlclxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkJhY2tvZmYucHJvdG90eXBlLnNldEppdHRlciA9IGZ1bmN0aW9uIChqaXR0ZXIpIHtcbiAgICB0aGlzLmppdHRlciA9IGppdHRlcjtcbn07XG4iLCJpbXBvcnQgeyBTb2NrZXQgYXMgRW5naW5lLCBpbnN0YWxsVGltZXJGdW5jdGlvbnMsIG5leHRUaWNrLCB9IGZyb20gXCJlbmdpbmUuaW8tY2xpZW50XCI7XG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi9zb2NrZXQuanNcIjtcbmltcG9ydCAqIGFzIHBhcnNlciBmcm9tIFwic29ja2V0LmlvLXBhcnNlclwiO1xuaW1wb3J0IHsgb24gfSBmcm9tIFwiLi9vbi5qc1wiO1xuaW1wb3J0IHsgQmFja29mZiB9IGZyb20gXCIuL2NvbnRyaWIvYmFja28yLmpzXCI7XG5pbXBvcnQgeyBFbWl0dGVyLCB9IGZyb20gXCJAc29ja2V0LmlvL2NvbXBvbmVudC1lbWl0dGVyXCI7XG5leHBvcnQgY2xhc3MgTWFuYWdlciBleHRlbmRzIEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yKHVyaSwgb3B0cykge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMubnNwcyA9IHt9O1xuICAgICAgICB0aGlzLnN1YnMgPSBbXTtcbiAgICAgICAgaWYgKHVyaSAmJiBcIm9iamVjdFwiID09PSB0eXBlb2YgdXJpKSB7XG4gICAgICAgICAgICBvcHRzID0gdXJpO1xuICAgICAgICAgICAgdXJpID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgICBvcHRzLnBhdGggPSBvcHRzLnBhdGggfHwgXCIvc29ja2V0LmlvXCI7XG4gICAgICAgIHRoaXMub3B0cyA9IG9wdHM7XG4gICAgICAgIGluc3RhbGxUaW1lckZ1bmN0aW9ucyh0aGlzLCBvcHRzKTtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3Rpb24ob3B0cy5yZWNvbm5lY3Rpb24gIT09IGZhbHNlKTtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3Rpb25BdHRlbXB0cyhvcHRzLnJlY29ubmVjdGlvbkF0dGVtcHRzIHx8IEluZmluaXR5KTtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3Rpb25EZWxheShvcHRzLnJlY29ubmVjdGlvbkRlbGF5IHx8IDEwMDApO1xuICAgICAgICB0aGlzLnJlY29ubmVjdGlvbkRlbGF5TWF4KG9wdHMucmVjb25uZWN0aW9uRGVsYXlNYXggfHwgNTAwMCk7XG4gICAgICAgIHRoaXMucmFuZG9taXphdGlvbkZhY3RvcigoX2EgPSBvcHRzLnJhbmRvbWl6YXRpb25GYWN0b3IpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IDAuNSk7XG4gICAgICAgIHRoaXMuYmFja29mZiA9IG5ldyBCYWNrb2ZmKHtcbiAgICAgICAgICAgIG1pbjogdGhpcy5yZWNvbm5lY3Rpb25EZWxheSgpLFxuICAgICAgICAgICAgbWF4OiB0aGlzLnJlY29ubmVjdGlvbkRlbGF5TWF4KCksXG4gICAgICAgICAgICBqaXR0ZXI6IHRoaXMucmFuZG9taXphdGlvbkZhY3RvcigpLFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy50aW1lb3V0KG51bGwgPT0gb3B0cy50aW1lb3V0ID8gMjAwMDAgOiBvcHRzLnRpbWVvdXQpO1xuICAgICAgICB0aGlzLl9yZWFkeVN0YXRlID0gXCJjbG9zZWRcIjtcbiAgICAgICAgdGhpcy51cmkgPSB1cmk7XG4gICAgICAgIGNvbnN0IF9wYXJzZXIgPSBvcHRzLnBhcnNlciB8fCBwYXJzZXI7XG4gICAgICAgIHRoaXMuZW5jb2RlciA9IG5ldyBfcGFyc2VyLkVuY29kZXIoKTtcbiAgICAgICAgdGhpcy5kZWNvZGVyID0gbmV3IF9wYXJzZXIuRGVjb2RlcigpO1xuICAgICAgICB0aGlzLl9hdXRvQ29ubmVjdCA9IG9wdHMuYXV0b0Nvbm5lY3QgIT09IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5fYXV0b0Nvbm5lY3QpXG4gICAgICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gICAgcmVjb25uZWN0aW9uKHYpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlY29ubmVjdGlvbjtcbiAgICAgICAgdGhpcy5fcmVjb25uZWN0aW9uID0gISF2O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmVjb25uZWN0aW9uQXR0ZW1wdHModikge1xuICAgICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlY29ubmVjdGlvbkF0dGVtcHRzO1xuICAgICAgICB0aGlzLl9yZWNvbm5lY3Rpb25BdHRlbXB0cyA9IHY7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZWNvbm5lY3Rpb25EZWxheSh2KSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWNvbm5lY3Rpb25EZWxheTtcbiAgICAgICAgdGhpcy5fcmVjb25uZWN0aW9uRGVsYXkgPSB2O1xuICAgICAgICAoX2EgPSB0aGlzLmJhY2tvZmYpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5zZXRNaW4odik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByYW5kb21pemF0aW9uRmFjdG9yKHYpIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbWl6YXRpb25GYWN0b3I7XG4gICAgICAgIHRoaXMuX3JhbmRvbWl6YXRpb25GYWN0b3IgPSB2O1xuICAgICAgICAoX2EgPSB0aGlzLmJhY2tvZmYpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5zZXRKaXR0ZXIodik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZWNvbm5lY3Rpb25EZWxheU1heCh2KSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWNvbm5lY3Rpb25EZWxheU1heDtcbiAgICAgICAgdGhpcy5fcmVjb25uZWN0aW9uRGVsYXlNYXggPSB2O1xuICAgICAgICAoX2EgPSB0aGlzLmJhY2tvZmYpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5zZXRNYXgodik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB0aW1lb3V0KHYpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RpbWVvdXQ7XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSB2O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3RhcnRzIHRyeWluZyB0byByZWNvbm5lY3QgaWYgcmVjb25uZWN0aW9uIGlzIGVuYWJsZWQgYW5kIHdlIGhhdmUgbm90XG4gICAgICogc3RhcnRlZCByZWNvbm5lY3RpbmcgeWV0XG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG1heWJlUmVjb25uZWN0T25PcGVuKCkge1xuICAgICAgICAvLyBPbmx5IHRyeSB0byByZWNvbm5lY3QgaWYgaXQncyB0aGUgZmlyc3QgdGltZSB3ZSdyZSBjb25uZWN0aW5nXG4gICAgICAgIGlmICghdGhpcy5fcmVjb25uZWN0aW5nICYmXG4gICAgICAgICAgICB0aGlzLl9yZWNvbm5lY3Rpb24gJiZcbiAgICAgICAgICAgIHRoaXMuYmFja29mZi5hdHRlbXB0cyA9PT0gMCkge1xuICAgICAgICAgICAgLy8ga2VlcHMgcmVjb25uZWN0aW9uIGZyb20gZmlyaW5nIHR3aWNlIGZvciB0aGUgc2FtZSByZWNvbm5lY3Rpb24gbG9vcFxuICAgICAgICAgICAgdGhpcy5yZWNvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjdXJyZW50IHRyYW5zcG9ydCBgc29ja2V0YC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gb3B0aW9uYWwsIGNhbGxiYWNrXG4gICAgICogQHJldHVybiBzZWxmXG4gICAgICogQHB1YmxpY1xuICAgICAqL1xuICAgIG9wZW4oZm4pIHtcbiAgICAgICAgaWYgKH50aGlzLl9yZWFkeVN0YXRlLmluZGV4T2YoXCJvcGVuXCIpKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIHRoaXMuZW5naW5lID0gbmV3IEVuZ2luZSh0aGlzLnVyaSwgdGhpcy5vcHRzKTtcbiAgICAgICAgY29uc3Qgc29ja2V0ID0gdGhpcy5lbmdpbmU7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLl9yZWFkeVN0YXRlID0gXCJvcGVuaW5nXCI7XG4gICAgICAgIHRoaXMuc2tpcFJlY29ubmVjdCA9IGZhbHNlO1xuICAgICAgICAvLyBlbWl0IGBvcGVuYFxuICAgICAgICBjb25zdCBvcGVuU3ViRGVzdHJveSA9IG9uKHNvY2tldCwgXCJvcGVuXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYub25vcGVuKCk7XG4gICAgICAgICAgICBmbiAmJiBmbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZW1pdCBgZXJyb3JgXG4gICAgICAgIGNvbnN0IGVycm9yU3ViID0gb24oc29ja2V0LCBcImVycm9yXCIsIChlcnIpID0+IHtcbiAgICAgICAgICAgIHNlbGYuY2xlYW51cCgpO1xuICAgICAgICAgICAgc2VsZi5fcmVhZHlTdGF0ZSA9IFwiY2xvc2VkXCI7XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImVycm9yXCIsIGVycik7XG4gICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBkbyB0aGlzIGlmIHRoZXJlIGlzIG5vIGZuIHRvIGhhbmRsZSB0aGUgZXJyb3JcbiAgICAgICAgICAgICAgICBzZWxmLm1heWJlUmVjb25uZWN0T25PcGVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZmFsc2UgIT09IHRoaXMuX3RpbWVvdXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVvdXQgPSB0aGlzLl90aW1lb3V0O1xuICAgICAgICAgICAgaWYgKHRpbWVvdXQgPT09IDApIHtcbiAgICAgICAgICAgICAgICBvcGVuU3ViRGVzdHJveSgpOyAvLyBwcmV2ZW50cyBhIHJhY2UgY29uZGl0aW9uIHdpdGggdGhlICdvcGVuJyBldmVudFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2V0IHRpbWVyXG4gICAgICAgICAgICBjb25zdCB0aW1lciA9IHRoaXMuc2V0VGltZW91dEZuKCgpID0+IHtcbiAgICAgICAgICAgICAgICBvcGVuU3ViRGVzdHJveSgpO1xuICAgICAgICAgICAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICBzb2NrZXQuZW1pdChcImVycm9yXCIsIG5ldyBFcnJvcihcInRpbWVvdXRcIikpO1xuICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLmF1dG9VbnJlZikge1xuICAgICAgICAgICAgICAgIHRpbWVyLnVucmVmKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN1YnMucHVzaChmdW5jdGlvbiBzdWJEZXN0cm95KCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN1YnMucHVzaChvcGVuU3ViRGVzdHJveSk7XG4gICAgICAgIHRoaXMuc3Vicy5wdXNoKGVycm9yU3ViKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciBvcGVuKClcbiAgICAgKlxuICAgICAqIEByZXR1cm4gc2VsZlxuICAgICAqIEBwdWJsaWNcbiAgICAgKi9cbiAgICBjb25uZWN0KGZuKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wZW4oZm4pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiB0cmFuc3BvcnQgb3Blbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25vcGVuKCkge1xuICAgICAgICAvLyBjbGVhciBvbGQgc3Vic1xuICAgICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICAgICAgLy8gbWFyayBhcyBvcGVuXG4gICAgICAgIHRoaXMuX3JlYWR5U3RhdGUgPSBcIm9wZW5cIjtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJvcGVuXCIpO1xuICAgICAgICAvLyBhZGQgbmV3IHN1YnNcbiAgICAgICAgY29uc3Qgc29ja2V0ID0gdGhpcy5lbmdpbmU7XG4gICAgICAgIHRoaXMuc3Vicy5wdXNoKG9uKHNvY2tldCwgXCJwaW5nXCIsIHRoaXMub25waW5nLmJpbmQodGhpcykpLCBvbihzb2NrZXQsIFwiZGF0YVwiLCB0aGlzLm9uZGF0YS5iaW5kKHRoaXMpKSwgb24oc29ja2V0LCBcImVycm9yXCIsIHRoaXMub25lcnJvci5iaW5kKHRoaXMpKSwgb24oc29ja2V0LCBcImNsb3NlXCIsIHRoaXMub25jbG9zZS5iaW5kKHRoaXMpKSwgb24odGhpcy5kZWNvZGVyLCBcImRlY29kZWRcIiwgdGhpcy5vbmRlY29kZWQuYmluZCh0aGlzKSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBhIHBpbmcuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9ucGluZygpIHtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJwaW5nXCIpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2l0aCBkYXRhLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbmRhdGEoZGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5kZWNvZGVyLmFkZChkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbmNsb3NlKFwicGFyc2UgZXJyb3JcIiwgZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gcGFyc2VyIGZ1bGx5IGRlY29kZXMgYSBwYWNrZXQuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uZGVjb2RlZChwYWNrZXQpIHtcbiAgICAgICAgLy8gdGhlIG5leHRUaWNrIGNhbGwgcHJldmVudHMgYW4gZXhjZXB0aW9uIGluIGEgdXNlci1wcm92aWRlZCBldmVudCBsaXN0ZW5lciBmcm9tIHRyaWdnZXJpbmcgYSBkaXNjb25uZWN0aW9uIGR1ZSB0byBhIFwicGFyc2UgZXJyb3JcIlxuICAgICAgICBuZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcInBhY2tldFwiLCBwYWNrZXQpO1xuICAgICAgICB9LCB0aGlzLnNldFRpbWVvdXRGbik7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIHNvY2tldCBlcnJvci5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25lcnJvcihlcnIpIHtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJlcnJvclwiLCBlcnIpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHNvY2tldCBmb3IgdGhlIGdpdmVuIGBuc3BgLlxuICAgICAqXG4gICAgICogQHJldHVybiB7U29ja2V0fVxuICAgICAqIEBwdWJsaWNcbiAgICAgKi9cbiAgICBzb2NrZXQobnNwLCBvcHRzKSB7XG4gICAgICAgIGxldCBzb2NrZXQgPSB0aGlzLm5zcHNbbnNwXTtcbiAgICAgICAgaWYgKCFzb2NrZXQpIHtcbiAgICAgICAgICAgIHNvY2tldCA9IG5ldyBTb2NrZXQodGhpcywgbnNwLCBvcHRzKTtcbiAgICAgICAgICAgIHRoaXMubnNwc1tuc3BdID0gc29ja2V0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuX2F1dG9Db25uZWN0ICYmICFzb2NrZXQuYWN0aXZlKSB7XG4gICAgICAgICAgICBzb2NrZXQuY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb2NrZXQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIGEgc29ja2V0IGNsb3NlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHNvY2tldFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2Rlc3Ryb3koc29ja2V0KSB7XG4gICAgICAgIGNvbnN0IG5zcHMgPSBPYmplY3Qua2V5cyh0aGlzLm5zcHMpO1xuICAgICAgICBmb3IgKGNvbnN0IG5zcCBvZiBuc3BzKSB7XG4gICAgICAgICAgICBjb25zdCBzb2NrZXQgPSB0aGlzLm5zcHNbbnNwXTtcbiAgICAgICAgICAgIGlmIChzb2NrZXQuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Nsb3NlKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyaXRlcyBhIHBhY2tldC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYWNrZXRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9wYWNrZXQocGFja2V0KSB7XG4gICAgICAgIGNvbnN0IGVuY29kZWRQYWNrZXRzID0gdGhpcy5lbmNvZGVyLmVuY29kZShwYWNrZXQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVuY29kZWRQYWNrZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS53cml0ZShlbmNvZGVkUGFja2V0c1tpXSwgcGFja2V0Lm9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHRyYW5zcG9ydCBzdWJzY3JpcHRpb25zIGFuZCBwYWNrZXQgYnVmZmVyLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBjbGVhbnVwKCkge1xuICAgICAgICB0aGlzLnN1YnMuZm9yRWFjaCgoc3ViRGVzdHJveSkgPT4gc3ViRGVzdHJveSgpKTtcbiAgICAgICAgdGhpcy5zdWJzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuZGVjb2Rlci5kZXN0cm95KCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlIHRoZSBjdXJyZW50IHNvY2tldC5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2Nsb3NlKCkge1xuICAgICAgICB0aGlzLnNraXBSZWNvbm5lY3QgPSB0cnVlO1xuICAgICAgICB0aGlzLl9yZWNvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5vbmNsb3NlKFwiZm9yY2VkIGNsb3NlXCIpO1xuICAgICAgICBpZiAodGhpcy5lbmdpbmUpXG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5jbG9zZSgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3IgY2xvc2UoKVxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBkaXNjb25uZWN0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2xvc2UoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gZW5naW5lIGNsb3NlLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbmNsb3NlKHJlYXNvbiwgZGVzY3JpcHRpb24pIHtcbiAgICAgICAgdGhpcy5jbGVhbnVwKCk7XG4gICAgICAgIHRoaXMuYmFja29mZi5yZXNldCgpO1xuICAgICAgICB0aGlzLl9yZWFkeVN0YXRlID0gXCJjbG9zZWRcIjtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJjbG9zZVwiLCByZWFzb24sIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgaWYgKHRoaXMuX3JlY29ubmVjdGlvbiAmJiAhdGhpcy5za2lwUmVjb25uZWN0KSB7XG4gICAgICAgICAgICB0aGlzLnJlY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEF0dGVtcHQgYSByZWNvbm5lY3Rpb24uXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHJlY29ubmVjdCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3JlY29ubmVjdGluZyB8fCB0aGlzLnNraXBSZWNvbm5lY3QpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGlmICh0aGlzLmJhY2tvZmYuYXR0ZW1wdHMgPj0gdGhpcy5fcmVjb25uZWN0aW9uQXR0ZW1wdHMpIHtcbiAgICAgICAgICAgIHRoaXMuYmFja29mZi5yZXNldCgpO1xuICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJyZWNvbm5lY3RfZmFpbGVkXCIpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25uZWN0aW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWxheSA9IHRoaXMuYmFja29mZi5kdXJhdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25uZWN0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5zZXRUaW1lb3V0Rm4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLnNraXBSZWNvbm5lY3QpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcInJlY29ubmVjdF9hdHRlbXB0XCIsIHNlbGYuYmFja29mZi5hdHRlbXB0cyk7XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgYWdhaW4gZm9yIHRoZSBjYXNlIHNvY2tldCBjbG9zZWQgaW4gYWJvdmUgZXZlbnRzXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuc2tpcFJlY29ubmVjdClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHNlbGYub3BlbigoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlY29ubmVjdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWNvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicmVjb25uZWN0X2Vycm9yXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLm9ucmVjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGRlbGF5KTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuYXV0b1VucmVmKSB7XG4gICAgICAgICAgICAgICAgdGltZXIudW5yZWYoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3Vicy5wdXNoKGZ1bmN0aW9uIHN1YkRlc3Ryb3koKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIHN1Y2Nlc3NmdWwgcmVjb25uZWN0LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbnJlY29ubmVjdCgpIHtcbiAgICAgICAgY29uc3QgYXR0ZW1wdCA9IHRoaXMuYmFja29mZi5hdHRlbXB0cztcbiAgICAgICAgdGhpcy5fcmVjb25uZWN0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYmFja29mZi5yZXNldCgpO1xuICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcInJlY29ubmVjdFwiLCBhdHRlbXB0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1cmwgfSBmcm9tIFwiLi91cmwuanNcIjtcbmltcG9ydCB7IE1hbmFnZXIgfSBmcm9tIFwiLi9tYW5hZ2VyLmpzXCI7XG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi9zb2NrZXQuanNcIjtcbi8qKlxuICogTWFuYWdlcnMgY2FjaGUuXG4gKi9cbmNvbnN0IGNhY2hlID0ge307XG5mdW5jdGlvbiBsb29rdXAodXJpLCBvcHRzKSB7XG4gICAgaWYgKHR5cGVvZiB1cmkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgb3B0cyA9IHVyaTtcbiAgICAgICAgdXJpID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICBjb25zdCBwYXJzZWQgPSB1cmwodXJpLCBvcHRzLnBhdGggfHwgXCIvc29ja2V0LmlvXCIpO1xuICAgIGNvbnN0IHNvdXJjZSA9IHBhcnNlZC5zb3VyY2U7XG4gICAgY29uc3QgaWQgPSBwYXJzZWQuaWQ7XG4gICAgY29uc3QgcGF0aCA9IHBhcnNlZC5wYXRoO1xuICAgIGNvbnN0IHNhbWVOYW1lc3BhY2UgPSBjYWNoZVtpZF0gJiYgcGF0aCBpbiBjYWNoZVtpZF1bXCJuc3BzXCJdO1xuICAgIGNvbnN0IG5ld0Nvbm5lY3Rpb24gPSBvcHRzLmZvcmNlTmV3IHx8XG4gICAgICAgIG9wdHNbXCJmb3JjZSBuZXcgY29ubmVjdGlvblwiXSB8fFxuICAgICAgICBmYWxzZSA9PT0gb3B0cy5tdWx0aXBsZXggfHxcbiAgICAgICAgc2FtZU5hbWVzcGFjZTtcbiAgICBsZXQgaW87XG4gICAgaWYgKG5ld0Nvbm5lY3Rpb24pIHtcbiAgICAgICAgaW8gPSBuZXcgTWFuYWdlcihzb3VyY2UsIG9wdHMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFjYWNoZVtpZF0pIHtcbiAgICAgICAgICAgIGNhY2hlW2lkXSA9IG5ldyBNYW5hZ2VyKHNvdXJjZSwgb3B0cyk7XG4gICAgICAgIH1cbiAgICAgICAgaW8gPSBjYWNoZVtpZF07XG4gICAgfVxuICAgIGlmIChwYXJzZWQucXVlcnkgJiYgIW9wdHMucXVlcnkpIHtcbiAgICAgICAgb3B0cy5xdWVyeSA9IHBhcnNlZC5xdWVyeUtleTtcbiAgICB9XG4gICAgcmV0dXJuIGlvLnNvY2tldChwYXJzZWQucGF0aCwgb3B0cyk7XG59XG4vLyBzbyB0aGF0IFwibG9va3VwXCIgY2FuIGJlIHVzZWQgYm90aCBhcyBhIGZ1bmN0aW9uIChlLmcuIGBpbyguLi4pYCkgYW5kIGFzIGFcbi8vIG5hbWVzcGFjZSAoZS5nLiBgaW8uY29ubmVjdCguLi4pYCksIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG5PYmplY3QuYXNzaWduKGxvb2t1cCwge1xuICAgIE1hbmFnZXIsXG4gICAgU29ja2V0LFxuICAgIGlvOiBsb29rdXAsXG4gICAgY29ubmVjdDogbG9va3VwLFxufSk7XG4vKipcbiAqIFByb3RvY29sIHZlcnNpb24uXG4gKlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgeyBwcm90b2NvbCB9IGZyb20gXCJzb2NrZXQuaW8tcGFyc2VyXCI7XG4vKipcbiAqIEV4cG9zZSBjb25zdHJ1Y3RvcnMgZm9yIHN0YW5kYWxvbmUgYnVpbGQuXG4gKlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgeyBNYW5hZ2VyLCBTb2NrZXQsIGxvb2t1cCBhcyBpbywgbG9va3VwIGFzIGNvbm5lY3QsIGxvb2t1cCBhcyBkZWZhdWx0LCB9O1xuIiwiLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4vLyBUaW1lciBjbGFzcyBtb2R1bGVcclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuLy8gVGltZXIgY2xhc3MgY29uc3RydWN0b3IgZnVuY3Rpb25cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4vLyBUaW1lciBjbGFzcyBtb2R1bGVcclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4vLyBUaW1lciBjbGFzcyBjb25zdHJ1Y3RvciBmdW5jdGlvblxyXG5leHBvcnQgY2xhc3MgVGltZXIge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgLy8gVGltZXIgb2J0YWluIGN1cnJlbnQgdGltZSBpbiBzZWNvbmRzIG1ldGhvZFxyXG4gICAgY29uc3QgZ2V0VGltZSA9ICgpID0+IHtcclxuICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGxldCB0ID1cclxuICAgICAgICBkYXRlLmdldE1pbGxpc2Vjb25kcygpIC8gMTAwMC4wICtcclxuICAgICAgICBkYXRlLmdldFNlY29uZHMoKSArXHJcbiAgICAgICAgZGF0ZS5nZXRNaW51dGVzKCkgKiA2MDtcclxuICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFRpbWVyIHJlc3BvbnNlIG1ldGhvZFxyXG4gICAgdGhpcy5yZXNwb25zZSA9ICh0YWdfaWQgPSBudWxsKSA9PiB7XHJcbiAgICAgIGxldCB0ID0gZ2V0VGltZSgpO1xyXG4gICAgICAvLyBHbG9iYWwgdGltZVxyXG4gICAgICB0aGlzLmdsb2JhbFRpbWUgPSB0O1xyXG4gICAgICB0aGlzLmdsb2JhbERlbHRhVGltZSA9IHQgLSB0aGlzLm9sZFRpbWU7XHJcbiAgICAgIC8vIFRpbWUgd2l0aCBwYXVzZVxyXG4gICAgICBpZiAodGhpcy5pc1BhdXNlKSB7XHJcbiAgICAgICAgdGhpcy5sb2NhbERlbHRhVGltZSA9IDA7XHJcbiAgICAgICAgdGhpcy5wYXVzZVRpbWUgKz0gdCAtIHRoaXMub2xkVGltZTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmxvY2FsRGVsdGFUaW1lID0gdGhpcy5nbG9iYWxEZWx0YVRpbWU7XHJcbiAgICAgICAgdGhpcy5sb2NhbFRpbWUgPSB0IC0gdGhpcy5wYXVzZVRpbWUgLSB0aGlzLnN0YXJ0VGltZTtcclxuICAgICAgfVxyXG4gICAgICAvLyBGUFNcclxuICAgICAgdGhpcy5mcmFtZUNvdW50ZXIrKztcclxuICAgICAgaWYgKHQgLSB0aGlzLm9sZFRpbWVGUFMgPiAzKSB7XHJcbiAgICAgICAgdGhpcy5GUFMgPSB0aGlzLmZyYW1lQ291bnRlciAvICh0IC0gdGhpcy5vbGRUaW1lRlBTKTtcclxuICAgICAgICB0aGlzLm9sZFRpbWVGUFMgPSB0O1xyXG4gICAgICAgIHRoaXMuZnJhbWVDb3VudGVyID0gMDtcclxuICAgICAgICBpZiAodGFnX2lkICE9IG51bGwpXHJcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0YWdfaWQpLmlubmVySFRNTCA9IHRoaXMuZ2V0RlBTKCk7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5vbGRUaW1lID0gdDtcclxuICAgIH07XHJcblxyXG4gICAgLy8gT2J0YWluIEZQUyBhcyBzdHJpbmcgbWV0aG9kXHJcbiAgICB0aGlzLmdldEZQUyA9ICgpID0+IHRoaXMuRlBTLnRvRml4ZWQoMyk7XHJcblxyXG4gICAgLy8gRmlsbCB0aW1lciBnbG9iYWwgZGF0YVxyXG4gICAgdGhpcy5nbG9iYWxUaW1lID0gdGhpcy5sb2NhbFRpbWUgPSBnZXRUaW1lKCk7XHJcbiAgICB0aGlzLmdsb2JhbERlbHRhVGltZSA9IHRoaXMubG9jYWxEZWx0YVRpbWUgPSAwO1xyXG5cclxuICAgIC8vIEZpbGwgdGltZXIgc2VtaSBnbG9iYWwgZGF0YVxyXG4gICAgdGhpcy5zdGFydFRpbWUgPSB0aGlzLm9sZFRpbWUgPSB0aGlzLm9sZFRpbWVGUFMgPSB0aGlzLmdsb2JhbFRpbWU7XHJcbiAgICB0aGlzLmZyYW1lQ291bnRlciA9IDA7XHJcbiAgICB0aGlzLmlzUGF1c2UgPSBmYWxzZTtcclxuICAgIHRoaXMuRlBTID0gMzAuMDtcclxuICAgIHRoaXMucGF1c2VUaW1lID0gMDtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn0gLy8gRW5kIG9mICdUaW1lcicgZnVuY3Rpb25cclxuIiwiLy8gTWF0aCBpbXBsZW1lbnRhdGlvbnMgZmlsZVxyXG5cclxuLyoqKlxyXG4gKiBWZWN0b3JzXHJcbiAqKiovXHJcblxyXG4vLyAzRCB2ZWN0b3IgY2xhc3NcclxuY2xhc3MgX3ZlYzMge1xyXG4gICAgLy8gU2V0IHZlY3RvclxyXG4gICAgY29uc3RydWN0b3IoeCwgeSwgeikge1xyXG4gICAgICAgIGlmICh4ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAodGhpcy54ID0gMCksICh0aGlzLnkgPSAwKSwgKHRoaXMueiA9IDApO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHggPT0gXCJvYmplY3RcIikge1xyXG4gICAgICAgICAgICBpZiAoeC5sZW5ndGggPT0gMykge1xyXG4gICAgICAgICAgICAgICAgKHRoaXMueCA9IHhbMF0pLCAodGhpcy55ID0geFsxXSksICh0aGlzLnogPSB4WzJdKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICh0aGlzLnggPSB4LngpLCAodGhpcy55ID0geC55KSwgKHRoaXMueiA9IHgueik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoeSA9PSB1bmRlZmluZWQgJiYgeiA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICh0aGlzLnggPSB4KSwgKHRoaXMueSA9IHgpLCAodGhpcy56ID0geCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAodGhpcy54ID0geCksICh0aGlzLnkgPSB5KSwgKHRoaXMueiA9IHopO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldCh4LCB5LCB6KSB7XHJcbiAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geSksICh0aGlzLnogPSB6KTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgdHdvIHZlY3RvcnMgZnVuY3Rpb25cclxuICAgIGFkZCh2ZWMpIHtcclxuICAgICAgICByZXR1cm4gdmVjMyh0aGlzLnggKyB2ZWMueCwgdGhpcy55ICsgdmVjLnksIHRoaXMueiArIHZlYy56KTtcclxuICAgIH1cclxuICAgIC8vIFN1YnRyYWN0IHR3byB2ZWN0b3JzIGZ1bmN0aW9uXHJcbiAgICBzdWIodmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHZlYzModGhpcy54IC0gdmVjLngsIHRoaXMueSAtIHZlYy55LCB0aGlzLnogLSB2ZWMueik7XHJcbiAgICB9XHJcbiAgICAvLyBNdWx0aXBseSBmdW5jdGlvblxyXG4gICAgbXVsKHYpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHYgPT0gXCJudW1iZXJcIilcclxuICAgICAgICAgICAgcmV0dXJuIHZlYzModGhpcy54ICogdiwgdGhpcy55ICogdiwgdGhpcy56ICogdik7XHJcbiAgICAgICAgcmV0dXJuIHZlYzModGhpcy54ICogdi54LCB0aGlzLnkgKiB2LnksIHRoaXMueiAqIHYueik7XHJcbiAgICB9XHJcbiAgICAvLyBEaXZpZGUgZnVuY3Rpb25cclxuICAgIGRpdih2KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgaWYgKHYgPT0gMCkgYWxlcnQoXCJEaXZpc2lvbiBieSB6ZXJvIVwiKTtcclxuICAgICAgICAgICAgaWYgKHYgPT0gMSkgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIHJldHVybiB2ZWMzKHRoaXMueCAvIHYsIHRoaXMueSAvIHYsIHRoaXMueiAvIHYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmVjMyh0aGlzLnggLyB2LngsIHRoaXMueSAvIHYueSwgdGhpcy56IC8gdi56KTtcclxuICAgIH1cclxuICAgIC8vIE5lZ2F0ZSB2ZWN0aXIgZnVuY3Rpb25cclxuICAgIG5lZygpIHtcclxuICAgICAgICByZXR1cm4gdmVjMygtdGhpcy54LCAtdGhpcy55LCAtdGhpcy56KTtcclxuICAgIH1cclxuICAgIC8vIFR3byB2ZWN0b3JzIGRvdCBwcm9kdWN0IGZ1bmN0aW9uXHJcbiAgICBkb3QodmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIHZlYy54ICsgdGhpcy55ICogdmVjLnkgKyB0aGlzLnogKiB2ZWMuejtcclxuICAgIH1cclxuICAgIC8vIFR3byB2ZWN0b3JzIGNyb3NzIHByb2R1Y3QgZnVuY3Rpb25cclxuICAgIGNyb3NzKHZlYykge1xyXG4gICAgICAgIHJldHVybiB2ZWMzKFxyXG4gICAgICAgICAgICB0aGlzLnkgKiB2ZWMueiAtIHRoaXMueiAqIHZlYy55LFxyXG4gICAgICAgICAgICB0aGlzLnogKiB2ZWMueCAtIHRoaXMueCAqIHZlYy56LFxyXG4gICAgICAgICAgICB0aGlzLnggKiB2ZWMueSAtIHRoaXMueSAqIHZlYy54XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuICAgIC8vIEdldCBsZW5ndGggb2YgdmVjdG9yIGZ1bmN0aW9uXHJcbiAgICBsZW5ndGgoKSB7XHJcbiAgICAgICAgbGV0IGxlbiA9IHRoaXMuZG90KHRoaXMpO1xyXG5cclxuICAgICAgICBpZiAobGVuID09IDEgfHwgbGVuID09IDApIHJldHVybiBsZW47XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydChsZW4pO1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGxlbmd0aCAqIGxlbmd0aCBvZiB2ZWN0b3IgZnVuY3Rpb25cclxuICAgIGxlbmd0aDIoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpO1xyXG4gICAgfVxyXG4gICAgLy8gTm9ybWFsaXplIHZlY3RvciBmdW5jdGlvblxyXG4gICAgbm9ybWFsaXplKCkge1xyXG4gICAgICAgIGxldCBsZW4gPSB0aGlzLmRvdCh0aGlzKTtcclxuXHJcbiAgICAgICAgaWYgKGxlbiA9PSAxIHx8IGxlbiA9PSAwKSByZXR1cm4gdGhpcztcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXYoTWF0aC5zcXJ0KGxlbikpO1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGFycmF5IGZyb20gdmVjM1xyXG4gICAgdG9BcnJheSgpIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnpdO1xyXG4gICAgfVxyXG4gICAgLy8gVHJhbnNmb3JtIHBvaW50IG9mIHZlY3RvciBmdW5jdGlvblxyXG4gICAgcG9pbnRUcmFuc2Zvcm0obWF0KSB7XHJcbiAgICAgICAgcmV0dXJuIHZlYzMoXHJcbiAgICAgICAgICAgIHRoaXMueCAqIG1hdC5tWzBdWzBdICtcclxuICAgICAgICAgICAgICAgIHRoaXMueSAqIG1hdC5tWzFdWzBdICtcclxuICAgICAgICAgICAgICAgIHRoaXMueiAqIG1hdC5tWzJdWzBdICtcclxuICAgICAgICAgICAgICAgIG1hdC5tWzNdWzBdLFxyXG4gICAgICAgICAgICB0aGlzLnggKiBtYXQubVswXVsxXSArXHJcbiAgICAgICAgICAgICAgICB0aGlzLnkgKiBtYXQubVsxXVsxXSArXHJcbiAgICAgICAgICAgICAgICB0aGlzLnogKiBtYXQubVsyXVsxXSArXHJcbiAgICAgICAgICAgICAgICBtYXQubVszXVsxXSxcclxuICAgICAgICAgICAgdGhpcy54ICogbWF0Lm1bMF1bMl0gK1xyXG4gICAgICAgICAgICAgICAgdGhpcy55ICogbWF0Lm1bMV1bMl0gK1xyXG4gICAgICAgICAgICAgICAgdGhpcy56ICogbWF0Lm1bMl1bMl0gK1xyXG4gICAgICAgICAgICAgICAgbWF0Lm1bM11bMl1cclxuICAgICAgICApO1xyXG4gICAgfVxyXG4gICAgLy8gVmVjdG9yIHRyYW5zZm9ybSBmdW5jdGlvblxyXG4gICAgdHJhbnNmb3JtKG1hdCkge1xyXG4gICAgICAgIHJldHVybiB2ZWMzKFxyXG4gICAgICAgICAgICB0aGlzLnggKiBtYXQubVswXVswXSArIHRoaXMueSAqIG1hdC5tWzFdWzBdICsgdGhpcy56ICogbWF0Lm1bMl1bMF0sXHJcbiAgICAgICAgICAgIHRoaXMueCAqIG1hdC5tWzBdWzFdICsgdGhpcy55ICogbWF0Lm1bMV1bMV0gKyB0aGlzLnogKiBtYXQubVsyXVsxXSxcclxuICAgICAgICAgICAgdGhpcy54ICogbWF0Lm1bMF1bMl0gKyB0aGlzLnkgKiBtYXQubVsxXVsyXSArIHRoaXMueiAqIG1hdC5tWzJdWzJdXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuICAgIC8vIFZlY3RvciBieSBtYXRyaXggbXVsdGlwbGljYXRpb24gZnVuY3Rpb25cclxuICAgIG11bE1hdHIobWF0KSB7XHJcbiAgICAgICAgbGV0IHcgPVxyXG4gICAgICAgICAgICB0aGlzLnggKiBtYXQubVswXVszXSArXHJcbiAgICAgICAgICAgIHRoaXMueSAqIG1hdC5tWzFdWzNdICtcclxuICAgICAgICAgICAgdGhpcy56ICogbWF0Lm1bMl1bM10gK1xyXG4gICAgICAgICAgICBtYXQubVszXVszXTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHZlYzMoXHJcbiAgICAgICAgICAgICh0aGlzLnggKiBtYXQubVswXVswXSArXHJcbiAgICAgICAgICAgICAgICB0aGlzLnkgKiBtYXQubVsxXVswXSArXHJcbiAgICAgICAgICAgICAgICB0aGlzLnogKiBtYXQubVsyXVswXSArXHJcbiAgICAgICAgICAgICAgICBtYXQubVszXVswXSkgL1xyXG4gICAgICAgICAgICAgICAgdyxcclxuICAgICAgICAgICAgKHRoaXMueCAqIG1hdC5tWzBdWzFdICtcclxuICAgICAgICAgICAgICAgIHRoaXMueSAqIG1hdC5tWzFdWzFdICtcclxuICAgICAgICAgICAgICAgIHRoaXMueiAqIG1hdC5tWzJdWzFdICtcclxuICAgICAgICAgICAgICAgIG1hdC5tWzNdWzFdKSAvXHJcbiAgICAgICAgICAgICAgICB3LFxyXG4gICAgICAgICAgICAodGhpcy54ICogbWF0Lm1bMF1bMl0gK1xyXG4gICAgICAgICAgICAgICAgdGhpcy55ICogbWF0Lm1bMV1bMl0gK1xyXG4gICAgICAgICAgICAgICAgdGhpcy56ICogbWF0Lm1bMl1bMl0gK1xyXG4gICAgICAgICAgICAgICAgbWF0Lm1bM11bMl0pIC9cclxuICAgICAgICAgICAgICAgIHdcclxuICAgICAgICApO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB2ZWMzKC4uLmFyZ3MpIHtcclxuICAgIHJldHVybiBuZXcgX3ZlYzMoLi4uYXJncyk7XHJcbn1cclxuIiwiLy8gTWF0aCBpbXBsZW1lbnRhdGlvbnMgZmlsZVxyXG5cclxuLyoqKlxyXG4gKiBWZWN0b3JzXHJcbiAqKiovXHJcblxyXG4vLyAzRCB2ZWN0b3IgY2xhc3NcclxuY2xhc3MgX3ZlYzIge1xyXG4gICAgLy8gU2V0IHZlY3RvclxyXG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xyXG4gICAgICAgIGlmICh4ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAodGhpcy54ID0gMCksICh0aGlzLnkgPSAwKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB4ID09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgaWYgKHgubGVuZ3RoID09IDIpIHtcclxuICAgICAgICAgICAgICAgICh0aGlzLnggPSB4WzBdKSwgKHRoaXMueSA9IHhbMV0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgKHRoaXMueCA9IHgueCksICh0aGlzLnkgPSB4LnkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAodGhpcy54ID0geCksICh0aGlzLnkgPSB4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICh0aGlzLnggPSB4KSwgKHRoaXMueSA9IHkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldCh4LCB5KSB7XHJcbiAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHR3byB2ZWN0b3JzIGZ1bmN0aW9uXHJcbiAgICBhZGQodmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHZlYzIodGhpcy54ICsgdmVjLngsIHRoaXMueSArIHZlYy55KTtcclxuICAgIH1cclxuICAgIC8vIFN1YnRyYWN0IHR3byB2ZWN0b3JzIGZ1bmN0aW9uXHJcbiAgICBzdWIodmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHZlYzIodGhpcy54IC0gdmVjLngsIHRoaXMueSAtIHZlYy55KTtcclxuICAgIH1cclxuICAgIC8vIE11bHRpcGx5IGZ1bmN0aW9uXHJcbiAgICBtdWwodikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdiA9PSBcIm51bWJlclwiKSByZXR1cm4gdmVjMih0aGlzLnggKiB2LCB0aGlzLnkgKiB2KTtcclxuICAgICAgICByZXR1cm4gdmVjMih0aGlzLnggKiB2LngsIHRoaXMueSAqIHYueSk7XHJcbiAgICB9XHJcbiAgICAvLyBEaXZpZGUgZnVuY3Rpb25cclxuICAgIGRpdih2KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgaWYgKHYgPT0gMCkgYWxlcnQoXCJEaXZpc2lvbiBieSB6ZXJvIVwiKTtcclxuICAgICAgICAgICAgaWYgKHYgPT0gMSkgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIHJldHVybiB2ZWMyKHRoaXMueCAvIHYsIHRoaXMueSAvIHYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmVjMih0aGlzLnggLyB2LngsIHRoaXMueSAvIHYueSk7XHJcbiAgICB9XHJcbiAgICAvLyBUd28gdmVjdG9ycyBkb3QgcHJvZHVjdCBmdW5jdGlvblxyXG4gICAgZG90KHZlYykge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiB2ZWMueCArIHRoaXMueSAqIHZlYy55O1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGxlbmd0aCBvZiB2ZWN0b3IgZnVuY3Rpb25cclxuICAgIGxlbmd0aCgpIHtcclxuICAgICAgICBsZXQgbGVuID0gdGhpcy5kb3QodGhpcyk7XHJcblxyXG4gICAgICAgIGlmIChsZW4gPT0gMSB8fCBsZW4gPT0gMCkgcmV0dXJuIGxlbjtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KGxlbik7XHJcbiAgICB9XHJcbiAgICAvLyBHZXQgbGVuZ3RoICogbGVuZ3RoIG9mIHZlY3RvciBmdW5jdGlvblxyXG4gICAgbGVuZ3RoMigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kb3QodGhpcyk7XHJcbiAgICB9XHJcbiAgICAvLyBOb3JtYWxpemUgdmVjdG9yIGZ1bmN0aW9uXHJcbiAgICBub3JtYWxpemUoKSB7XHJcbiAgICAgICAgbGV0IGxlbiA9IHRoaXMuZG90KHRoaXMpO1xyXG5cclxuICAgICAgICBpZiAobGVuID09IDEgfHwgbGVuID09IDApIHJldHVybiB0aGlzO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpdihNYXRoLnNxcnQobGVuKSk7XHJcbiAgICB9XHJcbiAgICAvLyBHZXQgYXJyYXkgZnJvbSB2ZWMyXHJcbiAgICB0b0FycmF5KCkge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB2ZWMyKC4uLmFyZ3MpIHtcclxuICAgIHJldHVybiBuZXcgX3ZlYzIoLi4uYXJncyk7XHJcbn1cclxuIiwiLy8gTWF0aCBpbXBsZW1lbnRhdGlvbnMgZmlsZVxyXG5cclxuLyoqKlxyXG4gKiBWZWN0b3JzXHJcbiAqKiovXHJcblxyXG4vLyA0RCB2ZWN0b3IgY2xhc3NcclxuY2xhc3MgX3ZlYzQge1xyXG4gICAgLy8gU2V0IHZlY3RvclxyXG4gICAgY29uc3RydWN0b3IoeCwgeSwgeiwgdykge1xyXG4gICAgICAgIGlmICh4ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAodGhpcy54ID0gMCksICh0aGlzLnkgPSAwKSwgKHRoaXMueiA9IDApLCAodGhpcy53ID0gMCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgeCA9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgIGlmICh4Lmxlbmd0aCA9PSA0KSB7XHJcbiAgICAgICAgICAgICAgICAodGhpcy54ID0geFswXSksXHJcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMueSA9IHhbMV0pLFxyXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnogPSB4WzJdKSxcclxuICAgICAgICAgICAgICAgICAgICAodGhpcy53ID0geFszXSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAodGhpcy54ID0geC54KSwgKHRoaXMueSA9IHgueSksICh0aGlzLnogPSB4LnopLCAodGhpcy53ID0geC53KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh5ID09IHVuZGVmaW5lZCAmJiB6ID09IHVuZGVmaW5lZCAmJiB3ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geCksICh0aGlzLnogPSB4KSwgKHRoaXMudyA9IHgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geSksICh0aGlzLnogPSB6KSwgKHRoaXMudyA9IHcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldCh4LCB5LCB6LCB3KSB7XHJcbiAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geSksICh0aGlzLnogPSB6KSwgKHRoaXMudyA9IHcpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCB0d28gdmVjdG9ycyBmdW5jdGlvblxyXG4gICAgYWRkKHZlYykge1xyXG4gICAgICAgIHJldHVybiB2ZWM0KFxyXG4gICAgICAgICAgICB0aGlzLnggKyB2ZWMueCxcclxuICAgICAgICAgICAgdGhpcy55ICsgdmVjLnksXHJcbiAgICAgICAgICAgIHRoaXMueiArIHZlYy56LFxyXG4gICAgICAgICAgICB0aGlzLncgKyB2ZWMud1xyXG4gICAgICAgICk7XHJcbiAgICB9XHJcbiAgICAvLyBTdWJ0cmFjdCB0d28gdmVjdG9ycyBmdW5jdGlvblxyXG4gICAgc3ViKHZlYykge1xyXG4gICAgICAgIHJldHVybiB2ZWM0KFxyXG4gICAgICAgICAgICB0aGlzLnggLSB2ZWMueCxcclxuICAgICAgICAgICAgdGhpcy55IC0gdmVjLnksXHJcbiAgICAgICAgICAgIHRoaXMueiAtIHZlYy56LFxyXG4gICAgICAgICAgICB0aGlzLncgLSB2ZWMud1xyXG4gICAgICAgICk7XHJcbiAgICB9XHJcbiAgICAvLyBNdWx0aXBseSBmdW5jdGlvblxyXG4gICAgbXVsKHYpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHYgPT0gXCJudW1iZXJcIilcclxuICAgICAgICAgICAgcmV0dXJuIHZlYzQodGhpcy54ICogdiwgdGhpcy55ICogdiwgdGhpcy56ICogdiwgdGhpcy53ICogdik7XHJcbiAgICAgICAgcmV0dXJuIHZlYzModGhpcy54ICogdi54LCB0aGlzLnkgKiB2LnksIHRoaXMueiAqIHYueiwgdGhpcy53ICogdi53KTtcclxuICAgIH1cclxuICAgIC8vIERpdmlkZSBmdW5jdGlvblxyXG4gICAgZGl2KHYpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHYgPT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICBpZiAodiA9PSAwKSBhbGVydChcIkRpdmlzaW9uIGJ5IHplcm8hXCIpO1xyXG4gICAgICAgICAgICBpZiAodiA9PSAxKSByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgcmV0dXJuIHZlYzQodGhpcy54IC8gdiwgdGhpcy55IC8gdiwgdGhpcy56IC8gdiwgdGhpcy53IC8gdik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2ZWM0KHRoaXMueCAvIHYueCwgdGhpcy55IC8gdi55LCB0aGlzLnogLyB2LnosIHRoaXMudyAvIHYudyk7XHJcbiAgICB9XHJcbiAgICAvLyBUd28gdmVjdG9ycyBkb3QgcHJvZHVjdCBmdW5jdGlvblxyXG4gICAgZG90KHZlYykge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIHRoaXMueCAqIHZlYy54ICsgdGhpcy55ICogdmVjLnkgKyB0aGlzLnogKiB2ZWMueiArIHRoaXMudyAqIHZlYy53XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuICAgIC8vIEdldCBsZW5ndGggb2YgdmVjdG9yIGZ1bmN0aW9uXHJcbiAgICBsZW5ndGgoKSB7XHJcbiAgICAgICAgbGV0IGxlbiA9IHRoaXMuZG90KHRoaXMpO1xyXG5cclxuICAgICAgICBpZiAobGVuID09IDEgfHwgbGVuID09IDApIHJldHVybiBsZW47XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydChsZW4pO1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGxlbmd0aCAqIGxlbmd0aCBvZiB2ZWN0b3IgZnVuY3Rpb25cclxuICAgIGxlbmd0aDIoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpO1xyXG4gICAgfVxyXG4gICAgLy8gTm9ybWFsaXplIHZlY3RvciBmdW5jdGlvblxyXG4gICAgbm9ybWFsaXplKCkge1xyXG4gICAgICAgIGxldCBsZW4gPSB0aGlzLmRvdCh0aGlzKTtcclxuXHJcbiAgICAgICAgaWYgKGxlbiA9PSAxIHx8IGxlbiA9PSAwKSByZXR1cm4gdGhpcztcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXYoTWF0aC5zcXJ0KGxlbikpO1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGFycmF5IGZyb20gdmVjM1xyXG4gICAgdG9BcnJheSgpIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnosIHRoaXMud107XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHZlYzQoLi4uYXJncykge1xyXG4gICAgcmV0dXJuIG5ldyBfdmVjNCguLi5hcmdzKTtcclxufVxyXG5cclxuLy8gZXhwb3J0IGZ1bmN0aW9uIHZlYzIoLi4uYXJncykge1xyXG4vLyAgICAgcmV0dXJuIG5ldyBfdmVjMyguLi5hcmdzKTtcclxuLy8gfVxyXG5cclxuLy8gZXhwb3J0IGZ1bmN0aW9uIHZlYzQoLi4uYXJncykge1xyXG4vLyAgICAgcmV0dXJuIG5ldyBfdmVjMyguLi5hcmdzKTtcclxuLy8gfVxyXG4iLCIvLyBNYXRoIGltcGxlbWVudGF0aW9ucyBmaWxlXHJcblxyXG4vLyBEZWdyZWVzIHRvIHJhZGlhbnMgY29udmVyc2lvblxyXG5leHBvcnQgZnVuY3Rpb24gRDJSKGEpIHtcclxuICByZXR1cm4gYSAqIChNYXRoLlBJIC8gMTgwLjApO1xyXG59XHJcbi8vIFJhZGlhbnMgdG8gZGVncmVlcyBjb252ZXJzaW9uXHJcbmV4cG9ydCBmdW5jdGlvbiBSMkQoYSkge1xyXG4gIHJldHVybiBhICogKDE4MC4wIC8gTWF0aC5QSSk7XHJcbn1cclxuXHJcbi8qKipcclxuICogTWF0cmljZXNcclxuICoqKi9cclxuXHJcbmNsYXNzIF9tYXQ0IHtcclxuICBjb25zdHJ1Y3RvcihtID0gbnVsbCkge1xyXG4gICAgaWYgKG0gPT0gbnVsbClcclxuICAgICAgdGhpcy5tID0gW1xyXG4gICAgICAgIFsxLCAwLCAwLCAwXSxcclxuICAgICAgICBbMCwgMSwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDAsIDEsIDBdLFxyXG4gICAgICAgIFswLCAwLCAwLCAxXSxcclxuICAgICAgXTtcclxuICAgIGVsc2UgaWYgKHR5cGVvZiBtID09IFwib2JqZWN0XCIgJiYgbS5sZW5ndGggPT0gNCkge1xyXG4gICAgICB0aGlzLm0gPSBtO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5tID0gbS5tO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbXVsKG0pIHtcclxuICAgIGxldCBtYXRyO1xyXG5cclxuICAgIGlmIChtLmxlbmd0aCA9PSA0KSBtYXRyID0gbTtcclxuICAgIGVsc2UgbWF0ciA9IG0ubTtcclxuXHJcbiAgICB0aGlzLm0gPSBbXHJcbiAgICAgIFtcclxuICAgICAgICB0aGlzLm1bMF1bMF0gKiBtYXRyWzBdWzBdICtcclxuICAgICAgICAgIHRoaXMubVswXVsxXSAqIG1hdHJbMV1bMF0gK1xyXG4gICAgICAgICAgdGhpcy5tWzBdWzJdICogbWF0clsyXVswXSArXHJcbiAgICAgICAgICB0aGlzLm1bMF1bM10gKiBtYXRyWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVswXVswXSAqIG1hdHJbMF1bMV0gK1xyXG4gICAgICAgICAgdGhpcy5tWzBdWzFdICogbWF0clsxXVsxXSArXHJcbiAgICAgICAgICB0aGlzLm1bMF1bMl0gKiBtYXRyWzJdWzFdICtcclxuICAgICAgICAgIHRoaXMubVswXVszXSAqIG1hdHJbM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzBdICogbWF0clswXVsyXSArXHJcbiAgICAgICAgICB0aGlzLm1bMF1bMV0gKiBtYXRyWzFdWzJdICtcclxuICAgICAgICAgIHRoaXMubVswXVsyXSAqIG1hdHJbMl1bMl0gK1xyXG4gICAgICAgICAgdGhpcy5tWzBdWzNdICogbWF0clszXVsyXSxcclxuICAgICAgICB0aGlzLm1bMF1bMF0gKiBtYXRyWzBdWzNdICtcclxuICAgICAgICAgIHRoaXMubVswXVsxXSAqIG1hdHJbMV1bM10gK1xyXG4gICAgICAgICAgdGhpcy5tWzBdWzJdICogbWF0clsyXVszXSArXHJcbiAgICAgICAgICB0aGlzLm1bMF1bM10gKiBtYXRyWzNdWzNdLFxyXG4gICAgICBdLFxyXG4gICAgICBbXHJcbiAgICAgICAgdGhpcy5tWzFdWzBdICogbWF0clswXVswXSArXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMV0gKiBtYXRyWzFdWzBdICtcclxuICAgICAgICAgIHRoaXMubVsxXVsyXSAqIG1hdHJbMl1bMF0gK1xyXG4gICAgICAgICAgdGhpcy5tWzFdWzNdICogbWF0clszXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMF0gKiBtYXRyWzBdWzFdICtcclxuICAgICAgICAgIHRoaXMubVsxXVsxXSAqIG1hdHJbMV1bMV0gK1xyXG4gICAgICAgICAgdGhpcy5tWzFdWzJdICogbWF0clsyXVsxXSArXHJcbiAgICAgICAgICB0aGlzLm1bMV1bM10gKiBtYXRyWzNdWzFdLFxyXG4gICAgICAgIHRoaXMubVsxXVswXSAqIG1hdHJbMF1bMl0gK1xyXG4gICAgICAgICAgdGhpcy5tWzFdWzFdICogbWF0clsxXVsyXSArXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMl0gKiBtYXRyWzJdWzJdICtcclxuICAgICAgICAgIHRoaXMubVsxXVszXSAqIG1hdHJbM11bMl0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzBdICogbWF0clswXVszXSArXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMV0gKiBtYXRyWzFdWzNdICtcclxuICAgICAgICAgIHRoaXMubVsxXVsyXSAqIG1hdHJbMl1bM10gK1xyXG4gICAgICAgICAgdGhpcy5tWzFdWzNdICogbWF0clszXVszXSxcclxuICAgICAgXSxcclxuICAgICAgW1xyXG4gICAgICAgIHRoaXMubVsyXVswXSAqIG1hdHJbMF1bMF0gK1xyXG4gICAgICAgICAgdGhpcy5tWzJdWzFdICogbWF0clsxXVswXSArXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMl0gKiBtYXRyWzJdWzBdICtcclxuICAgICAgICAgIHRoaXMubVsyXVszXSAqIG1hdHJbM11bMF0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdICogbWF0clswXVsxXSArXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMV0gKiBtYXRyWzFdWzFdICtcclxuICAgICAgICAgIHRoaXMubVsyXVsyXSAqIG1hdHJbMl1bMV0gK1xyXG4gICAgICAgICAgdGhpcy5tWzJdWzNdICogbWF0clszXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bMF0gKiBtYXRyWzBdWzJdICtcclxuICAgICAgICAgIHRoaXMubVsyXVsxXSAqIG1hdHJbMV1bMl0gK1xyXG4gICAgICAgICAgdGhpcy5tWzJdWzJdICogbWF0clsyXVsyXSArXHJcbiAgICAgICAgICB0aGlzLm1bMl1bM10gKiBtYXRyWzNdWzJdLFxyXG4gICAgICAgIHRoaXMubVsyXVswXSAqIG1hdHJbMF1bM10gK1xyXG4gICAgICAgICAgdGhpcy5tWzJdWzFdICogbWF0clsxXVszXSArXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMl0gKiBtYXRyWzJdWzNdICtcclxuICAgICAgICAgIHRoaXMubVsyXVszXSAqIG1hdHJbM11bM10sXHJcbiAgICAgIF0sXHJcbiAgICAgIFtcclxuICAgICAgICB0aGlzLm1bM11bMF0gKiBtYXRyWzBdWzBdICtcclxuICAgICAgICAgIHRoaXMubVszXVsxXSAqIG1hdHJbMV1bMF0gK1xyXG4gICAgICAgICAgdGhpcy5tWzNdWzJdICogbWF0clsyXVswXSArXHJcbiAgICAgICAgICB0aGlzLm1bM11bM10gKiBtYXRyWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVswXSAqIG1hdHJbMF1bMV0gK1xyXG4gICAgICAgICAgdGhpcy5tWzNdWzFdICogbWF0clsxXVsxXSArXHJcbiAgICAgICAgICB0aGlzLm1bM11bMl0gKiBtYXRyWzJdWzFdICtcclxuICAgICAgICAgIHRoaXMubVszXVszXSAqIG1hdHJbM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdICogbWF0clswXVsyXSArXHJcbiAgICAgICAgICB0aGlzLm1bM11bMV0gKiBtYXRyWzFdWzJdICtcclxuICAgICAgICAgIHRoaXMubVszXVsyXSAqIG1hdHJbMl1bMl0gK1xyXG4gICAgICAgICAgdGhpcy5tWzNdWzNdICogbWF0clszXVsyXSxcclxuICAgICAgICB0aGlzLm1bM11bMF0gKiBtYXRyWzBdWzNdICtcclxuICAgICAgICAgIHRoaXMubVszXVsxXSAqIG1hdHJbMV1bM10gK1xyXG4gICAgICAgICAgdGhpcy5tWzNdWzJdICogbWF0clsyXVszXSArXHJcbiAgICAgICAgICB0aGlzLm1bM11bM10gKiBtYXRyWzNdWzNdLFxyXG4gICAgICBdLFxyXG4gICAgXTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLy8gU2V0IHRyYW5zbGF0ZSBtYXRyaXhcclxuICBzZXRUcmFuc2xhdGUoZHgsIGR5LCBkeikge1xyXG4gICAgaWYgKHR5cGVvZiBkeCA9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgIHRoaXMubSA9IFtcclxuICAgICAgICBbMSwgMCwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgICBbZHgueCwgZHgueSwgZHgueiwgMV0sXHJcbiAgICAgIF07XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgaWYgKGR5ID09IHVuZGVmaW5lZCAmJiBkeiA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdGhpcy5tID0gW1xyXG4gICAgICAgIFsxLCAwLCAwLCAwXSxcclxuICAgICAgICBbMCwgMSwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDAsIDEsIDBdLFxyXG4gICAgICAgIFtkeCwgZHgsIGR4LCAxXSxcclxuICAgICAgXTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgICB0aGlzLm0gPSBbXHJcbiAgICAgIFsxLCAwLCAwLCAwXSxcclxuICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICBbMCwgMCwgMSwgMF0sXHJcbiAgICAgIFtkeCwgZHksIGR6LCAxXSxcclxuICAgIF07XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIFRyYW5zbGF0ZSBtYXRyaXhcclxuICB0cmFuc2xhdGUoZHgsIGR5LCBkeikge1xyXG4gICAgaWYgKHR5cGVvZiBkeCA9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgIHRoaXMubXVsKFtcclxuICAgICAgICBbMSwgMCwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgICBbZHgueCwgZHgueSwgZHgueiwgMV0sXHJcbiAgICAgIF0pO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIGlmIChkeSA9PSB1bmRlZmluZWQgJiYgZHogPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHRoaXMubXVsKFtcclxuICAgICAgICBbMSwgMCwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgICBbZHgsIGR4LCBkeCwgMV0sXHJcbiAgICAgIF0pO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIHRoaXMubXVsKFtcclxuICAgICAgWzEsIDAsIDAsIDBdLFxyXG4gICAgICBbMCwgMSwgMCwgMF0sXHJcbiAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgW2R4LCBkeSwgZHosIDFdLFxyXG4gICAgXSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIE1hdHJpeCBkZXRlcm1pbmF0b3IgM3gzXHJcbiAgZGV0ZXJtM3gzKGExMSwgYTEyLCBhMTMsIGEyMSwgYTIyLCBhMjMsIGEzMSwgYTMyLCBhMzMpIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgIGExMSAqIGEyMiAqIGEzMyAtXHJcbiAgICAgIGExMSAqIGEyMyAqIGEzMiAtXHJcbiAgICAgIGExMiAqIGEyMSAqIGEzMyArXHJcbiAgICAgIGExMiAqIGEyMyAqIGEzMSArXHJcbiAgICAgIGExMyAqIGEyMSAqIGEzMiAtXHJcbiAgICAgIGExMyAqIGEyMiAqIGEzMVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIE1hdHJpeCBkZXRlcm1pbmF0b3IgNHg0XHJcbiAgZGV0ZXJtKCkge1xyXG4gICAgbGV0IGRldCA9XHJcbiAgICAgIHRoaXMubVswXVswXSAqXHJcbiAgICAgICAgdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bMV1bM10sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bM10sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bM11cclxuICAgICAgICApIC1cclxuICAgICAgdGhpcy5tWzBdWzFdICpcclxuICAgICAgICB0aGlzLmRldGVybTN4MyhcclxuICAgICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICAgIHRoaXMubVsxXVsyXSxcclxuICAgICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICAgIHRoaXMubVsyXVswXSxcclxuICAgICAgICAgIHRoaXMubVsyXVsyXSxcclxuICAgICAgICAgIHRoaXMubVsyXVszXSxcclxuICAgICAgICAgIHRoaXMubVszXVswXSxcclxuICAgICAgICAgIHRoaXMubVszXVsyXSxcclxuICAgICAgICAgIHRoaXMubVszXVszXVxyXG4gICAgICAgICkgK1xyXG4gICAgICB0aGlzLm1bMF1bMl0gKlxyXG4gICAgICAgIHRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgICAgdGhpcy5tWzFdWzBdLFxyXG4gICAgICAgICAgdGhpcy5tWzFdWzFdLFxyXG4gICAgICAgICAgdGhpcy5tWzFdWzNdLFxyXG4gICAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgICAgdGhpcy5tWzJdWzFdLFxyXG4gICAgICAgICAgdGhpcy5tWzJdWzNdLFxyXG4gICAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgICAgdGhpcy5tWzNdWzFdLFxyXG4gICAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICAgKSAtXHJcbiAgICAgIHRoaXMubVswXVszXSAqXHJcbiAgICAgICAgdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMF0sXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMF0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMF0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMl1cclxuICAgICAgICApO1xyXG5cclxuICAgIHJldHVybiBkZXQ7XHJcbiAgfSAvLyBFbmQgb2YgJ2RldGVybScgZnVuY3Rpb25cclxuXHJcbiAgaW52ZXJzZSgpIHtcclxuICAgIGxldCByID0gW1tdLCBbXSwgW10sIFtdXTtcclxuICAgIGxldCBkZXQgPSB0aGlzLmRldGVybSgpO1xyXG5cclxuICAgIGlmIChkZXQgPT0gMCkge1xyXG4gICAgICBsZXQgbSA9IFtcclxuICAgICAgICBbMSwgMCwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgICBbMCwgMCwgMCwgMV0sXHJcbiAgICAgIF07XHJcblxyXG4gICAgICByZXR1cm4gbWF0NChtKTtcclxuICAgIH1cclxuXHJcbiAgICAvKiBCdWlsZCBhZGpvaW50IG1hdHJpeCAqL1xyXG4gICAgclswXVswXSA9XHJcbiAgICAgIHRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVsxXVsxXSxcclxuICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzNdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzNdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bMl0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICByWzFdWzBdID1cclxuICAgICAgLXRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzNdLFxyXG4gICAgICAgIHRoaXMubVsyXVswXSxcclxuICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzNdLFxyXG4gICAgICAgIHRoaXMubVszXVswXSxcclxuICAgICAgICB0aGlzLm1bM11bMl0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICByWzJdWzBdID1cclxuICAgICAgdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgdGhpcy5tWzFdWzBdLFxyXG4gICAgICAgIHRoaXMubVsxXVsxXSxcclxuICAgICAgICB0aGlzLm1bMV1bM10sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bM10sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bM11cclxuICAgICAgKSAvIGRldDtcclxuICAgIHJbM11bMF0gPVxyXG4gICAgICAtdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgdGhpcy5tWzFdWzBdLFxyXG4gICAgICAgIHRoaXMubVsxXVsxXSxcclxuICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bMl1cclxuICAgICAgKSAvIGRldDtcclxuXHJcbiAgICByWzBdWzFdID1cclxuICAgICAgLXRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVswXVsxXSxcclxuICAgICAgICB0aGlzLm1bMF1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzNdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzNdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bMl0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICByWzFdWzFdID1cclxuICAgICAgdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgdGhpcy5tWzBdWzBdLFxyXG4gICAgICAgIHRoaXMubVswXVsyXSxcclxuICAgICAgICB0aGlzLm1bMF1bM10sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgIHRoaXMubVsyXVsyXSxcclxuICAgICAgICB0aGlzLm1bMl1bM10sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVsyXSxcclxuICAgICAgICB0aGlzLm1bM11bM11cclxuICAgICAgKSAvIGRldDtcclxuICAgIHJbMl1bMV0gPVxyXG4gICAgICAtdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgdGhpcy5tWzBdWzBdLFxyXG4gICAgICAgIHRoaXMubVswXVsxXSxcclxuICAgICAgICB0aGlzLm1bMF1bM10sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bM10sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bM11cclxuICAgICAgKSAvIGRldDtcclxuICAgIHJbM11bMV0gPVxyXG4gICAgICB0aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzFdLFxyXG4gICAgICAgIHRoaXMubVswXVsyXSxcclxuICAgICAgICB0aGlzLm1bMl1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzFdLFxyXG4gICAgICAgIHRoaXMubVsyXVsyXSxcclxuICAgICAgICB0aGlzLm1bM11bMF0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzFdLFxyXG4gICAgICAgIHRoaXMubVszXVsyXVxyXG4gICAgICApIC8gZGV0O1xyXG5cclxuICAgIHJbMF1bMl0gPVxyXG4gICAgICB0aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzJdLFxyXG4gICAgICAgIHRoaXMubVszXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG4gICAgclsxXVsyXSA9XHJcbiAgICAgIC10aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bM11bMF0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzJdLFxyXG4gICAgICAgIHRoaXMubVszXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG4gICAgclsyXVsyXSA9XHJcbiAgICAgIHRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVswXVswXSxcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzNdLFxyXG4gICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzNdLFxyXG4gICAgICAgIHRoaXMubVszXVswXSxcclxuICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICByWzNdWzJdID1cclxuICAgICAgLXRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVswXVswXSxcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVszXVswXSxcclxuICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzJdXHJcbiAgICAgICkgLyBkZXQ7XHJcblxyXG4gICAgclswXVszXSA9XHJcbiAgICAgIC10aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bMl1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzJdLFxyXG4gICAgICAgIHRoaXMubVsyXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG5cclxuICAgIHJbMV1bM10gPVxyXG4gICAgICB0aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bMl1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzJdLFxyXG4gICAgICAgIHRoaXMubVsyXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG4gICAgclsyXVszXSA9XHJcbiAgICAgIC10aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzFdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzFdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bMl1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzFdLFxyXG4gICAgICAgIHRoaXMubVsyXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG4gICAgclszXVszXSA9XHJcbiAgICAgIHRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVswXVswXSxcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsyXVswXSxcclxuICAgICAgICB0aGlzLm1bMl1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzJdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICB0aGlzLm0gPSByO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSAvLyBFbmQgb2YgJ2ludmVyc2UnIGZ1bmN0aW9uXHJcblxyXG4gIC8vIFRyYW5zcG9zZWQgbWF0cml4XHJcbiAgdHJhbnNwb3NlKCkge1xyXG4gICAgbGV0IHIgPSBbW10sIFtdLCBbXSwgW11dO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKVxyXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDQ7IGorKykgcltpXVtqXSA9IHRoaXMubVtqXVtpXTtcclxuICAgIHJldHVybiBtYXQ0KHIpO1xyXG4gIH0gLy8gRW5kIG9mICd0cmFuc3Bvc2UnIGZ1bmN0aW9uXHJcblxyXG4gIC8vIFJvdGF0ZVggbWF0cml4XHJcbiAgcm90YXRlWChhbmdsZURlZykge1xyXG4gICAgY29uc3Qgc2kgPSBNYXRoLnNpbihEMlIoYW5nbGVEZWcpKTtcclxuICAgIGNvbnN0IGNvID0gTWF0aC5jb3MoRDJSKGFuZ2xlRGVnKSk7XHJcbiAgICBjb25zdCBtciA9IFtcclxuICAgICAgWzEsIDAsIDAsIDBdLFxyXG4gICAgICBbMCwgY28sIHNpLCAwXSxcclxuICAgICAgWzAsIC1zaSwgY28sIDBdLFxyXG4gICAgICBbMCwgMCwgMCwgMV0sXHJcbiAgICBdO1xyXG5cclxuICAgIHJldHVybiB0aGlzLm11bChtcik7XHJcbiAgfVxyXG5cclxuICAvLyBSb3RhdGVZIG1hdHJpeFxyXG4gIHJvdGF0ZVkoYW5nbGVEZWcpIHtcclxuICAgIGNvbnN0IHNpID0gTWF0aC5zaW4oRDJSKGFuZ2xlRGVnKSk7XHJcbiAgICBjb25zdCBjbyA9IE1hdGguY29zKEQyUihhbmdsZURlZykpO1xyXG4gICAgY29uc3QgbXIgPSBbXHJcbiAgICAgIFtjbywgMCwgLXNpLCAwXSxcclxuICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICBbc2ksIDAsIGNvLCAwXSxcclxuICAgICAgWzAsIDAsIDAsIDFdLFxyXG4gICAgXTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5tdWwobXIpO1xyXG4gIH1cclxuXHJcbiAgLy8gUm90YXRlWiBtYXRyaXhcclxuICByb3RhdGVaKGFuZ2xlRGVnKSB7XHJcbiAgICBjb25zdCBzaSA9IE1hdGguc2luKEQyUihhbmdsZURlZykpO1xyXG4gICAgY29uc3QgY28gPSBNYXRoLmNvcyhEMlIoYW5nbGVEZWcpKTtcclxuICAgIGNvbnN0IG1yID0gW1xyXG4gICAgICBbY28sIHNpLCAwLCAwXSxcclxuICAgICAgWy1zaSwgY28sIDAsIDBdLFxyXG4gICAgICBbMCwgMCwgMSwgMF0sXHJcbiAgICAgIFswLCAwLCAwLCAxXSxcclxuICAgIF07XHJcblxyXG4gICAgcmV0dXJuIHRoaXMubXVsKG1yKTtcclxuICB9XHJcblxyXG4gIHNldFJvdGF0ZShBbmdsZUluRGVncmVlLCBSKSB7XHJcbiAgICBsZXQgYSA9IEFuZ2xlSW5EZWdyZWUgKiBNYXRoLlBJLFxyXG4gICAgICBzaW5lID0gTWF0aC5zaW4oYSksXHJcbiAgICAgIGNvc2luZSA9IE1hdGguY29zKGEpO1xyXG4gICAgbGV0IHggPSAwLFxyXG4gICAgICB5ID0gMCxcclxuICAgICAgeiA9IDE7XHJcbiAgICBpZiAodHlwZW9mIFIgPT0gXCJvYmplY3RcIilcclxuICAgICAgaWYgKFIubGVuZ3RoID09IDMpICh4ID0gUlswXSksICh5ID0gUlsxXSksICh6ID0gUlsyXSk7XHJcbiAgICAgIGVsc2UgKHggPSBSLngpLCAoeSA9IFIueSksICh6ID0gUi56KTtcclxuICAgIC8vIFZlY3RvciBub3JtYWxpemVcclxuICAgIGxldCBsZW4gPSB4ICogeCArIHkgKiB5ICsgeiAqIHo7XHJcbiAgICBpZiAobGVuICE9IDAgJiYgbGVuICE9IDEpXHJcbiAgICAgIChsZW4gPSBNYXRoLnNxcnQobGVuKSksICh4IC89IGxlbiksICh5IC89IGxlbiksICh6IC89IGxlbik7XHJcbiAgICB0aGlzLm1bMF1bMF0gPSBjb3NpbmUgKyB4ICogeCAqICgxIC0gY29zaW5lKTtcclxuICAgIHRoaXMubVswXVsxXSA9IHggKiB5ICogKDEgLSBjb3NpbmUpICsgeiAqIHNpbmU7XHJcbiAgICB0aGlzLm1bMF1bMl0gPSB4ICogeiAqICgxIC0gY29zaW5lKSAtIHkgKiBzaW5lO1xyXG4gICAgdGhpcy5tWzBdWzNdID0gMDtcclxuICAgIHRoaXMubVsxXVswXSA9IHkgKiB4ICogKDEgLSBjb3NpbmUpIC0geiAqIHNpbmU7XHJcbiAgICB0aGlzLm1bMV1bMV0gPSBjb3NpbmUgKyB5ICogeSAqICgxIC0gY29zaW5lKTtcclxuICAgIHRoaXMubVsxXVsyXSA9IHkgKiB6ICogKDEgLSBjb3NpbmUpICsgeCAqIHNpbmU7XHJcbiAgICB0aGlzLm1bMV1bM10gPSAwO1xyXG4gICAgdGhpcy5tWzJdWzBdID0geiAqIHggKiAoMSAtIGNvc2luZSkgKyB5ICogc2luZTtcclxuICAgIHRoaXMubVsyXVsxXSA9IHogKiB5ICogKDEgLSBjb3NpbmUpIC0geCAqIHNpbmU7XHJcbiAgICB0aGlzLm1bMl1bMl0gPSBjb3NpbmUgKyB6ICogeiAqICgxIC0gY29zaW5lKTtcclxuICAgIHRoaXMubVsyXVszXSA9IDA7XHJcbiAgICB0aGlzLm1bM11bMF0gPSAwO1xyXG4gICAgdGhpcy5tWzNdWzFdID0gMDtcclxuICAgIHRoaXMubVszXVsyXSA9IDA7XHJcbiAgICB0aGlzLm1bM11bM10gPSAxO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSAvLyBFbmQgb2YgJ3NldFJvdGF0ZScgZnVuY3Rpb25cclxuXHJcbiAgcm90YXRlKEFuZ2xlSW5EZWdyZWUsIFIpIHtcclxuICAgIHJldHVybiB0aGlzLm11bChtYXQ0KCkuc2V0Um90YXRlKEFuZ2xlSW5EZWdyZWUsIFIpKTtcclxuICB9IC8vIEVuZCBvZiAncm90YXRlJyBmdW5jdGlvblxyXG5cclxuICBzZXRWaWV3KExvYywgQXQsIFVwMSkge1xyXG4gICAgbGV0IERpciA9IEF0LnN1YihMb2MpLm5vcm1hbGl6ZSgpLFxyXG4gICAgICBSaWdodCA9IERpci5jcm9zcyhVcDEpLm5vcm1hbGl6ZSgpLFxyXG4gICAgICBVcCA9IFJpZ2h0LmNyb3NzKERpcikubm9ybWFsaXplKCk7XHJcbiAgICB0aGlzLm0gPSBbXHJcbiAgICAgIFtSaWdodC54LCBVcC54LCAtRGlyLngsIDBdLFxyXG4gICAgICBbUmlnaHQueSwgVXAueSwgLURpci55LCAwXSxcclxuICAgICAgW1JpZ2h0LnosIFVwLnosIC1EaXIueiwgMF0sXHJcbiAgICAgIFstTG9jLmRvdChSaWdodCksIC1Mb2MuZG90KFVwKSwgTG9jLmRvdChEaXIpLCAxXSxcclxuICAgIF07XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9IC8vIEVuZCBvZiAnc2V0VmlldycgZnVuY3Rpb25cclxuXHJcbiAgc2V0T3J0aG8oTGVmdCwgUmlnaHQsIEJvdHRvbSwgVG9wLCBOZWFyLCBGYXIpIHtcclxuICAgIHRoaXMubSA9IFtcclxuICAgICAgWzIgLyAoUmlnaHQgLSBMZWZ0KSwgMCwgMCwgMF0sXHJcbiAgICAgIFswLCAyIC8gKFRvcCAtIEJvdHRvbSksIDAsIDBdLFxyXG4gICAgICBbMCwgMCwgLTIgLyAoRmFyIC0gTmVhciksIDBdLFxyXG4gICAgICBbXHJcbiAgICAgICAgLShSaWdodCArIExlZnQpIC8gKFJpZ2h0IC0gTGVmdCksXHJcbiAgICAgICAgLShUb3AgKyBCb3R0b20pIC8gKFRvcCAtIEJvdHRvbSksXHJcbiAgICAgICAgLShGYXIgKyBOZWFyKSAvIChGYXIgLSBOZWFyKSxcclxuICAgICAgICAxLFxyXG4gICAgICBdLFxyXG4gICAgXTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0gLy8gRW5kIG9mICdzZXRPcnRobycgZnVuY3Rpb25cclxuXHJcbiAgc2V0RnJ1c3R1bShMZWZ0LCBSaWdodCwgQm90dG9tLCBUb3AsIE5lYXIsIEZhcikge1xyXG4gICAgdGhpcy5tID0gW1xyXG4gICAgICBbKDIgKiBOZWFyKSAvIChSaWdodCAtIExlZnQpLCAwLCAwLCAwXSxcclxuICAgICAgWzAsICgyICogTmVhcikgLyAoVG9wIC0gQm90dG9tKSwgMCwgMF0sXHJcbiAgICAgIFtcclxuICAgICAgICAoUmlnaHQgKyBMZWZ0KSAvIChSaWdodCAtIExlZnQpLFxyXG4gICAgICAgIChUb3AgKyBCb3R0b20pIC8gKFRvcCAtIEJvdHRvbSksXHJcbiAgICAgICAgLShGYXIgKyBOZWFyKSAvIChGYXIgLSBOZWFyKSxcclxuICAgICAgICAtMSxcclxuICAgICAgXSxcclxuICAgICAgWzAsIDAsICgtMiAqIE5lYXIgKiBGYXIpIC8gKEZhciAtIE5lYXIpLCAwXSxcclxuICAgIF07XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9IC8vIEVuZCBvZiAnc2V0RnJ1c3R1bScgZnVuY3Rpb25cclxuXHJcbiAgdmlldyhMb2MsIEF0LCBVcDEpIHtcclxuICAgIHJldHVybiB0aGlzLm11bChtYXQ0KCkuc2V0VmlldyhMb2MsIEF0LCBVcDEpKTtcclxuICB9IC8vIEVuZCBvZiAndmlldycgZnVuY3Rpb25cclxuXHJcbiAgb3J0aG8oTGVmdCwgUmlnaHQsIEJvdHRvbSwgVG9wLCBOZWFyLCBGYXIpIHtcclxuICAgIHJldHVybiB0aGlzLm11bChtYXQ0KCkuc2V0T3J0aG8oTGVmdCwgUmlnaHQsIEJvdHRvbSwgVG9wLCBOZWFyLCBGYXIpKTtcclxuICB9IC8vIEVuZCBvZiAnb3J0aG8nIGZ1bmN0aW9uXHJcblxyXG4gIGZydXN0dW0oTGVmdCwgUmlnaHQsIEJvdHRvbSwgVG9wLCBOZWFyLCBGYXIpIHtcclxuICAgIHJldHVybiB0aGlzLm11bChtYXQ0KCkuc2V0RnJ1c3R1bShMZWZ0LCBSaWdodCwgQm90dG9tLCBUb3AsIE5lYXIsIEZhcikpO1xyXG4gIH0gLy8gRW5kIGlmICdmcnVzdHVtJyBmdW5jdGlvblxyXG5cclxuICB0b0FycmF5KCkge1xyXG4gICAgcmV0dXJuIFtdLmNvbmNhdCguLi50aGlzLm0pO1xyXG4gIH0gLy8gRW5kIG9mICd0b0FycmF5JyBmdW5jdGlvblxyXG5cclxuICBtdWwyKG0xLCBtMikge1xyXG4gICAgcmV0dXJuIG1hdDQobTEpLm11bChtMik7XHJcbiAgfSAvLyBFbmQgb2YgJ211bDInIGZ1bmN0aW9uXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXQ0KC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF9tYXQ0KC4uLmFyZ3MpO1xyXG59XHJcbiIsImltcG9ydCB7IG1hdDQgfSBmcm9tIFwiLi9tYXQ0LmpzXCI7XHJcbmltcG9ydCB7IHZlYzMgfSBmcm9tIFwiLi92ZWMzLmpzXCI7XHJcblxyXG5jbGFzcyBfY2FtZXJhIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIC8vIFByb2plY3Rpb24gcHJvcGVydGllc1xyXG4gICAgdGhpcy5wcm9qU2l6ZSA9IDAuMTsgLy8gUHJvamVjdCBwbGFuZSBmaXQgc3F1YXJlXHJcbiAgICB0aGlzLnByb2pEaXN0ID0gMC4xOyAvLyBEaXN0YW5jZSB0byBwcm9qZWN0IHBsYW5lIGZyb20gdmlld2VyIChuZWFyKVxyXG4gICAgdGhpcy5wcm9qRmFyQ2xpcCA9IDIwMDA7IC8vIERpc3RhbmNlIHRvIHByb2plY3QgZmFyIGNsaXAgcGxhbmUgKGZhcilcclxuXHJcbiAgICAvLyBMb2NhbCBzaXplIGRhdGFcclxuICAgIHRoaXMuZnJhbWVXID0gMzA7IC8vIEZyYW1lIHdpZHRoXHJcbiAgICB0aGlzLmZyYW1lSCA9IDMwOyAvLyBGcmFtZSBoZWlnaHRcclxuXHJcbiAgICAvLyBNYXRyaWNlc1xyXG4gICAgdGhpcy5tYXRyVmlldyA9IG1hdDQoKTsgLy8gVmlldyBjb29yZGluYXRlIHN5c3RlbSBtYXRyaXhcclxuICAgIHRoaXMubWF0clByb2ogPSBtYXQ0KCk7IC8vIFByb2plY3Rpb24gY29vcmRpbmF0ZSBzeXN0ZW0gbWF0cml4XHJcbiAgICB0aGlzLm1hdHJWUCA9IG1hdDQoKTsgLy8gVmlldyBhbmQgcHJvamVjdGlvbiBtYXRyaXggcHJlY2FsY3VsYXRlIHZhbHVlXHJcblxyXG4gICAgLy8gU2V0IGNhbWVyYSBkZWZhdWx0IHNldHRpbmdzXHJcbiAgICB0aGlzLmxvYyA9IHZlYzMoKTsgLy8gQ2FtZXJhIGxvY2F0aW9uXHJcbiAgICB0aGlzLmF0ID0gdmVjMygpOyAvLyBDYW1lcmEgZGVzdGluYXRpb25cclxuICAgIHRoaXMuZGlyID0gdmVjMygpOyAvLyBDYW1lcmEgRGlyZWN0aW9uXHJcbiAgICB0aGlzLnVwID0gdmVjMygpOyAvLyBDYW1lcmEgVVAgZGlyZWN0aW9uXHJcbiAgICB0aGlzLnJpZ2h0ID0gdmVjMygpOyAvLyBDYW1lcmEgUklHSFQgZGlyZWN0aW9uXHJcbiAgICB0aGlzLnNldERlZigpO1xyXG4gIH0gLy8gRW5kIG9mICdjb25zdHJ1Y3RvcicgZnVuY3Rpb25cclxuXHJcbiAgLy8gQ2FtZXJhIHBhcm1ldGVycyBzZXR0aW5nIGZ1bmN0aW9uXHJcbiAgc2V0KGxvYywgYXQsIHVwKSB7XHJcbiAgICB0aGlzLm1hdHJWaWV3LnNldFZpZXcobG9jLCBhdCwgdXApO1xyXG4gICAgdGhpcy5sb2MgPSB2ZWMzKGxvYyk7XHJcbiAgICB0aGlzLmF0ID0gdmVjMyhhdCk7XHJcbiAgICB0aGlzLmRpci5zZXQoXHJcbiAgICAgIC10aGlzLm1hdHJWaWV3Lm1bMF1bMl0sXHJcbiAgICAgIC10aGlzLm1hdHJWaWV3Lm1bMV1bMl0sXHJcbiAgICAgIC10aGlzLm1hdHJWaWV3Lm1bMl1bMl1cclxuICAgICk7XHJcbiAgICB0aGlzLnVwLnNldChcclxuICAgICAgdGhpcy5tYXRyVmlldy5tWzBdWzFdLFxyXG4gICAgICB0aGlzLm1hdHJWaWV3Lm1bMV1bMV0sXHJcbiAgICAgIHRoaXMubWF0clZpZXcubVsyXVsxXVxyXG4gICAgKTtcclxuICAgIHRoaXMucmlnaHQuc2V0KFxyXG4gICAgICB0aGlzLm1hdHJWaWV3Lm1bMF1bMF0sXHJcbiAgICAgIHRoaXMubWF0clZpZXcubVsxXVswXSxcclxuICAgICAgdGhpcy5tYXRyVmlldy5tWzJdWzBdXHJcbiAgICApO1xyXG4gICAgdGhpcy5tYXRyVlAgPSBtYXQ0KHRoaXMubWF0clZpZXcpLm11bCh0aGlzLm1hdHJQcm9qKTtcclxuICB9IC8vIEVuZCBvZiAnc2V0JyBmdW5jdGlvblxyXG5cclxuICAvLyBQcm9qZWN0aW9uIHBhcmFtZXRlcnMgc2V0dGluZyBmdW5jdGlvbi5cclxuICBzZXRQcm9qKHByb2pTaXplLCBwcm9qRGlzdCwgcHJvakZhckNsaXApIHtcclxuICAgIGxldCByeCA9IHByb2pTaXplLFxyXG4gICAgICByeSA9IHByb2pTaXplO1xyXG5cclxuICAgIHRoaXMucHJvakRpc3QgPSBwcm9qRGlzdDtcclxuICAgIHRoaXMucHJvalNpemUgPSBwcm9qU2l6ZTtcclxuICAgIHRoaXMucHJvakZhckNsaXAgPSBwcm9qRmFyQ2xpcDtcclxuXHJcbiAgICAvLyBDb3JyZWN0IGFzcGVjdCByYXRpb1xyXG4gICAgaWYgKHRoaXMuZnJhbWVXID4gdGhpcy5mcmFtZUgpIHJ4ICo9IHRoaXMuZnJhbWVXIC8gdGhpcy5mcmFtZUg7XHJcbiAgICBlbHNlIHJ5ICo9IHRoaXMuZnJhbWVIIC8gdGhpcy5mcmFtZVc7XHJcbiAgICB0aGlzLm1hdHJQcm9qLnNldEZydXN0dW0oXHJcbiAgICAgIC1yeCAvIDIuMCxcclxuICAgICAgcnggLyAyLjAsXHJcbiAgICAgIC1yeSAvIDIuMCxcclxuICAgICAgcnkgLyAyLjAsXHJcbiAgICAgIHByb2pEaXN0LFxyXG4gICAgICBwcm9qRmFyQ2xpcFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBwcmUtY2FsY3VsYXRlIHZpZXcgKiBwcm9qIG1hdHJpeFxyXG4gICAgdGhpcy5tYXRyVlAgPSBtYXQ0KHRoaXMubWF0clZpZXcpLm11bCh0aGlzLm1hdHJQcm9qKTtcclxuICB9IC8vIEVuZCBvZiAnc2V0UHJvaicgZnVuY3Rpb25cclxuXHJcbiAgLy8gUmVzaXplIGNhbWVyYSBhbmQgcHJvamVjdGlvbiBmdW5jdGlvbi5cclxuICBzZXRTaXplKGZyYW1lVywgZnJhbWVIKSB7XHJcbiAgICBpZiAoZnJhbWVXIDwgMSkgZnJhbWVXID0gMTtcclxuICAgIGlmIChmcmFtZUggPCAxKSBmcmFtZUggPSAxO1xyXG4gICAgdGhpcy5mcmFtZVcgPSBmcmFtZVc7XHJcbiAgICB0aGlzLmZyYW1lSCA9IGZyYW1lSDtcclxuICAgIC8vIFJlc2V0IHByb2plY3Rpb24gd2l0aCBuZXcgcmVuZGVyIHdpbmRvdyBzaXplXHJcbiAgICB0aGlzLnNldFByb2oodGhpcy5wcm9qU2l6ZSwgdGhpcy5wcm9qRGlzdCwgdGhpcy5wcm9qRmFyQ2xpcCk7XHJcbiAgfSAvLyBFbmQgb2YgJ3NldFNpemUnIGZ1bmN0aW9uXHJcblxyXG4gIC8vIENhbWVyYSBzZXQgZGVmYXVsdCB2YWx1ZXMgZnVuY3Rpb24uXHJcbiAgc2V0RGVmKCkge1xyXG4gICAgdGhpcy5sb2Muc2V0KDAsIDE1LjMsIDE1LjMpO1xyXG4gICAgdGhpcy5hdC5zZXQoMCwgMCwgMCk7XHJcbiAgICB0aGlzLmRpci5zZXQoMCwgMCwgLTEpO1xyXG4gICAgdGhpcy51cC5zZXQoMCwgMSwgMCk7XHJcbiAgICB0aGlzLnJpZ2h0LnNldCgxLCAwLCAwKTtcclxuXHJcbiAgICB0aGlzLnByb2pEaXN0ID0gMC4xO1xyXG4gICAgdGhpcy5wcm9qU2l6ZSA9IDAuMTtcclxuICAgIHRoaXMucHJvakZhckNsaXAgPSA2MDAwO1xyXG5cclxuICAgIHRoaXMuZnJhbWVXID0gNDc7XHJcbiAgICB0aGlzLmZyYW1lSCA9IDQ3O1xyXG5cclxuICAgIHRoaXMuc2V0KHRoaXMubG9jLCB0aGlzLmF0LCB0aGlzLnVwKTtcclxuICAgIHRoaXMuc2V0UHJvaih0aGlzLnByb2pTaXplLCB0aGlzLnByb2pEaXN0LCB0aGlzLnByb2pGYXJDbGlwKTtcclxuICAgIHRoaXMuc2V0U2l6ZSh0aGlzLmZyYW1lVywgdGhpcy5mcmFtZUgpO1xyXG4gIH0gLy8gRW5kIG9mICdzZXREZWYnIGZ1bmN0aW9uXHJcbn0gLy8gRW5kIG9mICdjYW1lcmEnIGNsYXNzXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2FtZXJhKC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF9jYW1lcmEoYXJncyk7XHJcbn0gLy8gRW5kIG9mICdtYXQ0JyBmdW5jdGlvblxyXG5cclxuLyogRU5EIE9GICdjYW1lcmEuanMnIEZJTEUgKi9cclxuIiwiZXhwb3J0IGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2xDYW52YXNcIik7XHJcbmV4cG9ydCBjb25zdCBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2wyXCIpO1xyXG4vLyBleHBvcnQgbGV0IGFuaW07XHJcbiIsIi8vIFNoYWRlcnMgaW1wbGVtZW50YXRpb24gZmlsZVxyXG5pbXBvcnQgeyBnbCB9IGZyb20gXCIuLi8uLi8uLi9nbC5qc1wiO1xyXG5cclxuZXhwb3J0IGxldCBzaGFkZXJzID0gW107XHJcbmV4cG9ydCBsZXQgc2hhZGVyc1NpemUgPSAwO1xyXG5cclxuZXhwb3J0IGNsYXNzIF9zaGFkZXIge1xyXG4gIGNvbnN0cnVjdG9yKHNoYWRlckZpbGVOYW1lUHJlZml4KSB7XHJcbiAgICB0aGlzLm5hbWUgPSBzaGFkZXJGaWxlTmFtZVByZWZpeDtcclxuICAgIHRoaXMudmVydFRleHQgPSBmZXRjaFNoYWRlcihcclxuICAgICAgXCIuLi8uLi8uLi8uLi9iaW4vc2hhZGVycy9cIiArIHNoYWRlckZpbGVOYW1lUHJlZml4ICsgXCIvdmVydC5nbHNsXCJcclxuICAgICk7XHJcbiAgICB0aGlzLmZyYWdUZXh0ID0gZmV0Y2hTaGFkZXIoXHJcbiAgICAgIFwiLi4vLi4vLi4vLi4vYmluL3NoYWRlcnMvXCIgKyBzaGFkZXJGaWxlTmFtZVByZWZpeCArIFwiL2ZyYWcuZ2xzbFwiXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgYWRkKHZzLCBmcykge1xyXG4gICAgY29uc3QgdmVydGV4U2ggPSBsb2FkKGdsLlZFUlRFWF9TSEFERVIsIHZzKTtcclxuICAgIGNvbnN0IGZyYWdtZW50U2ggPSBsb2FkKGdsLkZSQUdNRU5UX1NIQURFUiwgZnMpO1xyXG5cclxuICAgIHRoaXMucHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcclxuICAgIGdsLmF0dGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIHZlcnRleFNoKTtcclxuICAgIGdsLmF0dGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIGZyYWdtZW50U2gpO1xyXG4gICAgZ2wubGlua1Byb2dyYW0odGhpcy5wcm9ncmFtKTtcclxuXHJcbiAgICBpZiAoIWdsLmdldFByb2dyYW1QYXJhbWV0ZXIodGhpcy5wcm9ncmFtLCBnbC5MSU5LX1NUQVRVUykpIHtcclxuICAgICAgYWxlcnQoXCJFcnJvciBsaW5rIHByb2dyYW0hXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHNoYWRlcnNbc2hhZGVyc1NpemVdID0ge1xyXG4gICAgICBuYW1lOiAwLFxyXG4gICAgICBwcm9ncmFtOiAtMSxcclxuICAgIH07XHJcbiAgICBzaGFkZXJzW3NoYWRlcnNTaXplXS5uYW1lID0gdGhpcy5uYW1lO1xyXG4gICAgc2hhZGVyc1tzaGFkZXJzU2l6ZV0ucHJvZ3JhbSA9IHRoaXMucHJvZ3JhbTtcclxuICAgIHNoYWRlcnNTaXplKys7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZCh0eXBlLCBzb3VyY2UpIHtcclxuICBjb25zdCBzaGFkZXIgPSBnbC5jcmVhdGVTaGFkZXIodHlwZSk7XHJcblxyXG4gIGdsLnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSk7XHJcbiAgZ2wuY29tcGlsZVNoYWRlcihzaGFkZXIpO1xyXG5cclxuICBpZiAoIWdsLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIGdsLkNPTVBJTEVfU1RBVFVTKSkge1xyXG4gICAgYWxlcnQoXHJcbiAgICAgIFwiRXJyb3IgbG9hZCBcIiArXHJcbiAgICAgICAgKHR5cGUgPT09IGdsLlZFUlRFWF9TSEFERVIgPyBcInZlcnRleFwiIDogXCJmcmFnbWVudFwiKSArXHJcbiAgICAgICAgXCIgc2hhZGVyOiBcIiArXHJcbiAgICAgICAgZ2wuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHNoYWRlcjtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoU2hhZGVyKHNoYWRlclVSTCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHNoYWRlclVSTCk7XHJcbiAgICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG5cclxuICAgIHJldHVybiB0ZXh0O1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgY29uc29sZS5lcnJvcihlcnIpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzXHJcbmV4cG9ydCBmdW5jdGlvbiBzaGFkZXIoLi4uYXJncykge1xyXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxyXG4gIHJldHVybiBuZXcgX3NoYWRlciguLi5hcmdzKTtcclxufVxyXG4iLCIvLyBNYXRlcmlhbCBpbXBsZW1lbnRhdGlvbiBmaWxlXHJcbmltcG9ydCB7IHZlYzMgfSBmcm9tIFwiLi4vLi4vLi4vbXRoL210aC5qc1wiO1xyXG4vLyBpbXBvcnQgeyBybmQsIHNoZCwgdGV4IH0gZnJvbSBcIi4vcmVzb3VyY2UuanNcIjtcclxuaW1wb3J0ICogYXMgc2hkIGZyb20gXCIuL3NoYWRlci5qc1wiXHJcbmltcG9ydCB7IGdsIH0gZnJvbSBcIi4uLy4uLy4uL2dsLmpzXCI7XHJcblxyXG5leHBvcnQgbGV0IG1hdGVyaWFscyA9IFtdO1xyXG5leHBvcnQgbGV0IG1hdGVyaWFsc1NpemUgPSAwO1xyXG5cclxubGV0IG10bExpYiA9IFtbXCJibGFja1wiLCBbMC4wLCAwLjAsIDAuMF0sICAgICAgICAgICAgIFswLjAxLCAwLjAxLCAwLjAxXSwgICAgICAgICAgIFswLjUsIDAuNSwgMC41XSwgICAgICAgICAgICAgICAzMl0sXHJcbiAgW1wiQnJhc3NcIiwgICAgICAgICBbMC4zMjk0MTIsMC4yMjM1MjksMC4wMjc0NTFdLCBbMC43ODAzOTIsMC41Njg2MjcsMC4xMTM3MjVdLCBbMC45OTIxNTcsMC45NDExNzYsMC44MDc4NDNdLCAyNy44OTc0XSxcclxuICBbXCJvcmFuZ2VcIiwgICAgICAgIFsxLDAuNSwwXSwgICAgICAgWzEsMC41LDBdLCAgICAgICBbMC4zOTM1NDgsMC4yNzE5MDYsMC4xNjY3MjFdLCAgMjUuNl0sXHJcbiAgW1wiQ2hyb21lXCIsICAgICAgICBbMC4yNSwgMC4yNSwgMC4yNV0sICAgICAgICAgIFswLjQsIDAuNCwgMC40XSwgICAgICAgICAgICAgIFswLjc3NDU5NywgMC43NzQ1OTcsIDAuNzc0NTk3XSwgNzYuOF0sXHJcbiAgW1wiQ29wcGVyXCIsICAgICAgICBbMC4xOTEyNSwwLjA3MzUsMC4wMjI1XSwgICAgIFswLjcwMzgsMC4yNzA0OCwwLjA4MjhdLCAgICAgIFswLjI1Njc3NywwLjEzNzYyMiwwLjA4NjAxNF0sICAxMi44XSxcclxuICBbXCJ5ZWxsb3dcIiwgICAgICAgICAgWzEsMSwwXSwgICAgIFsxLDEsMF0sICAgIFswLjYyODI4MSwwLjU1NTgwMiwwLjM2NjA2NV0sICA1MS4yXSxcclxuICBbXCJQZXdldGVyXCIsICAgICAgIFswLjEwNTg4LDAuMDU4ODI0LDAuMTEzNzI1XSwgWzAuNDI3NDUxLDAuNDcwNTg4LDAuNTQxMTc2XSwgWzAuMzMzMywwLjMzMzMsMC41MjE1NjldLCAgICAgIDkuODQ2MTVdLFxyXG4gIFtcIlNpbHZlclwiLCAgICAgICAgWzAuMTkyMjUsMC4xOTIyNSwwLjE5MjI1XSwgICBbMC41MDc1NCwwLjUwNzU0LDAuNTA3NTRdLCAgICBbMC41MDgyNzMsMC41MDgyNzMsMC41MDgyNzNdLCAgNTEuMl0sXHJcbiAgW1wiUG9saXNoZWQgU2lsdmVyXCIsIFswLjIzMTI1LDAuMjMxMjUsMC4yMzEyNV0sIFswLjI3NzUsMC4yNzc1LDAuMjc3NV0sICAgICAgIFswLjc3MzkxMSwwLjc3MzkxMSwwLjc3MzkxMV0sICA4OS42XSxcclxuICBbXCJibHVlXCIsICAgICBbMCwgMCwgMV0sICAgICAgWzAsIDAsIDFdLCAgICBbMC4yOTcyNTQsIDAuMzA4MjksIDAuMzA2Njc4XSwgMTIuOF0sXHJcbiAgW1wicmVkXCIsICAgICAgICAgIFsxLCAwLCAwXSwgIFsxLCAwLCAwXSwgIFswLjcyNzgxMSwgMC42MjY5NTksIDAuNjI2OTU5XSwgNzYuOF0sXHJcbiAgW1wiUG9saXNoZWQgR29sZFwiLCBbMC4yNDcyNSwgMC4yMjQ1LCAwLjA2NDVdLCAgIFswLjM0NjE1LCAwLjMxNDMsIDAuMDkwM10sICAgIFswLjc5NzM1NywgMC43MjM5OTEsIDAuMjA4MDA2XSwgODMuMl0sXHJcbiAgW1wiUG9saXNoZWQgQnJvbnplXCIsIFswLjI1LCAwLjE0OCwgMC4wNjQ3NV0sICAgIFswLjQsIDAuMjM2OCwgMC4xMDM2XSwgICAgICAgIFswLjc3NDU5NywgMC40NTg1NjEsIDAuMjAwNjIxXSwgNzYuOF0sXHJcbiAgW1wiUG9saXNoZWQgQ29wcGVyXCIsIFswLjIyOTUsIDAuMDg4MjUsIDAuMDI3NV0sIFswLjU1MDgsIDAuMjExOCwgMC4wNjZdLCAgICAgIFswLjU4MDU5NCwgMC4yMjMyNTcsIDAuMDY5NTcwMV0sIDUxLjJdLFxyXG4gIFtcIkphZGVcIiwgICAgICAgICAgWzAuMTM1LCAwLjIyMjUsIDAuMTU3NV0sICAgICBbMC4xMzUsIDAuMjIyNSwgMC4xNTc1XSwgICAgICBbMC4zMTYyMjgsIDAuMzE2MjI4LCAwLjMxNjIyOF0sIDEyLjhdLFxyXG4gIFtcIk9ic2lkaWFuXCIsICAgICAgWzAuMDUzNzUsIDAuMDUsIDAuMDY2MjVdLCAgICBbMC4xODI3NSwgMC4xNywgMC4yMjUyNV0sICAgICBbMC4zMzI3NDEsIDAuMzI4NjM0LCAwLjM0NjQzNV0sIDM4LjRdLFxyXG4gIFtcIlBlYXJsXCIsICAgICAgICAgWzAuMjUsIDAuMjA3MjUsIDAuMjA3MjVdLCAgICBbMS4wLCAwLjgyOSwgMC44MjldLCAgICAgICAgICBbMC4yOTY2NDgsIDAuMjk2NjQ4LCAwLjI5NjY0OF0sIDExLjI2NF0sXHJcbiAgW1wiZ3JlZW5cIiwgICAgICAgWzAsIDEsIDBdLCAgICBbMCwgMSwgMF0sICBbMC42MzMsIDAuNzI3ODExLCAwLjYzM10sICAgICAgIDc2LjhdLFxyXG4gIFtcIkJsYWNrIFJ1YmJlclwiLCAgWzAuMDIsIDAuMDIsIDAuMDJdLCAgICAgICAgICBbMC4wMSwgMC4wMSwgMC4wMV0sICAgICAgICAgICBbMC40LCAwLjQsIDAuNF0sICAgICAgICAgICAgICAgIDEwLjBdXTtcclxuXHJcbmNsYXNzIF9tYXRlcmlhbCB7XHJcbiAgY29uc3RydWN0b3IobmFtZSwga2EsIGtkLCBrcywgcGgsIHRyYW5zLCB0ZXh0dXJlcywgc2hhZGVyKSB7XHJcbiAgICAvLyBDcmVhdGUgbWF0ZXJpYWxcclxuICAgIGlmIChuYW1lID09IHVuZGVmaW5lZCkge1xyXG4gICAgICB0aGlzLm5hbWUgPSBcIkRlZmF1bHQgbWF0ZXJpYWxcIjtcclxuICAgICAgdGhpcy5rYSA9IHZlYzMoMC4xKTtcclxuICAgICAgdGhpcy5rZCA9IHZlYzMoMC45KTtcclxuICAgICAgdGhpcy5rcyA9IHZlYzMoMC4zKTtcclxuICAgICAgdGhpcy5waCA9IDMwLjA7XHJcbiAgICAgIHRoaXMudHJhbnMgPSAxLjA7XHJcbiAgICAgIHRoaXMudGV4dHVyZXMgPSBbXHJcbiAgICAgICAgbnVsbCwgLy8gdGV4LnRleHR1cmUoXCIuLi8uLi8uLi8uLi9iaW4vdGV4dHVyZXMvQ0dTRy1Mb2dvLnBuZ1wiKSxcclxuICAgICAgICBudWxsLFxyXG4gICAgICAgIG51bGwsXHJcbiAgICAgICAgbnVsbCxcclxuICAgICAgICBudWxsLFxyXG4gICAgICAgIG51bGwsXHJcbiAgICAgICAgbnVsbCxcclxuICAgICAgICBudWxsLFxyXG4gICAgICBdO1xyXG4gICAgICB0aGlzLnNoYWRlciA9IHNoZC5zaGFkZXJzWzBdO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgICAgdGhpcy5rYSA9IHZlYzMoa2EpO1xyXG4gICAgICB0aGlzLmtkID0gdmVjMyhrZCk7XHJcbiAgICAgIHRoaXMua3MgPSB2ZWMzKGtzKTtcclxuICAgICAgdGhpcy5waCA9IHBoO1xyXG4gICAgICB0aGlzLnRyYW5zID0gdHJhbnM7XHJcbiAgICAgIHRoaXMudGV4dHVyZXMgPSB0ZXh0dXJlcztcclxuICAgICAgdGhpcy5zaGFkZXIgPSBzaGFkZXI7XHJcbiAgICB9XHJcbiAgICBtYXRlcmlhbHNbbWF0ZXJpYWxzU2l6ZV0gPSB0aGlzO1xyXG4gICAgdGhpcy5tdGxObyA9IG1hdGVyaWFsc1NpemUrKztcclxuICB9XHJcblxyXG4gIGFwcGx5KG10bE5vKSB7XHJcbiAgICBsZXQgcHJnID0gbWF0ZXJpYWxzW210bE5vXS5zaGFkZXIucHJvZ3JhbTtcclxuICAgIGlmIChwcmcgPT0gbnVsbCB8fCBwcmcgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHByZyA9IHNoZC5zaGFkZXJzWzBdLnByb2dyYW07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBwcmcgPSBzaGQuc2hhZGVyc1ttdGxOb10ucHJvZ3JhbTsgLy8gVE9ET1xyXG4gICAgfVxyXG4gICAgaWYgKHByZyA9PSAwKSByZXR1cm4gMDtcclxuICAgIGdsLnVzZVByb2dyYW0ocHJnKTtcclxuXHJcbiAgICBmb3IgKGxldCB0IGluIHRoaXMudGV4dHVyZXMpXHJcbiAgICAgIGlmICh0aGlzLnRleHR1cmVzW3RdICE9IG51bGwpXHJcbiAgICAgICAgdGhpcy50ZXh0dXJlc1t0XS5hcHBseSh0aGlzLnNoYWRlciwgTnVtYmVyKHQpKTtcclxuXHJcbiAgICByZXR1cm4gcHJnO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGVyaWFsKC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF9tYXRlcmlhbCguLi5hcmdzKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRNdGxMaWIoKSB7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtdGxMaWIubGVuZ3RoOyBpKyspe1xyXG4gICAgbWF0ZXJpYWwobXRsTGliW2ldWzBdLCB2ZWMzKG10bExpYltpXVsxXSksIHZlYzMobXRsTGliW2ldWzJdKSwgdmVjMyhtdGxMaWJbaV1bM10pLCBtdGxMaWJbaV1bNF0sIDEsIG51bGwsIHNoZC5zaGFkZXIoXCJkZWZhdWx0XCIpKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kTXRsQnlOYW1lKG5hbWUpIHtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IG1hdGVyaWFscy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKG1hdGVyaWFsc1tpXS5uYW1lID09PSBuYW1lKSB7XHJcbiAgICAgIHJldHVybiBtYXRlcmlhbHNbaV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWF0ZXJpYWxzWzBdO1xyXG59XHJcbiIsIi8vIFRleHR1cmVzIGltcGxlbWVudGF0aW9uIGZpbGVcclxuLy8gaW1wb3J0ICogYXMgcm5kIGZyb20gXCIuLi9yZW5kZXIuanNcIjtcclxuaW1wb3J0IHsgZ2wgfSBmcm9tIFwiLi4vLi4vLi4vZ2wuanNcIjtcclxuXHJcbmNsYXNzIF90ZXh0dXJlIHtcclxuICBjb25zdHJ1Y3RvcihmaWxlTmFtZSkge1xyXG4gICAgdGhpcy5pZCA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcclxuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQpO1xyXG4gICAgZ2wudGV4SW1hZ2UyRChcclxuICAgICAgZ2wuVEVYVFVSRV8yRCxcclxuICAgICAgMCxcclxuICAgICAgZ2wuUkdCQSxcclxuICAgICAgMSxcclxuICAgICAgMSxcclxuICAgICAgMCxcclxuICAgICAgZ2wuUkdCQSxcclxuICAgICAgZ2wuVU5TSUdORURfQllURSxcclxuICAgICAgbmV3IFVpbnQ4QXJyYXkoWzI1NSwgMjU1LCAyNTUsIDBdKVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuICAgIGltZy5zcmMgPSBmaWxlTmFtZTtcclxuICAgIGltZy5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgIGdsLnRleEltYWdlMkQoXHJcbiAgICAgICAgZ2wuVEVYVFVSRV8yRCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIGdsLlJHQkEsXHJcbiAgICAgICAgZ2wuUkdCQSxcclxuICAgICAgICBnbC5VTlNJR05FRF9CWVRFLFxyXG4gICAgICAgIGltZ1xyXG4gICAgICApO1xyXG4gICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEKTtcclxuICAgICAgZ2wudGV4UGFyYW1ldGVyaShcclxuICAgICAgICBnbC5URVhUVVJFXzJELFxyXG4gICAgICAgIGdsLlRFWFRVUkVfV1JBUF9TLFxyXG4gICAgICAgIGdsLlJFUEVBVFxyXG4gICAgICApO1xyXG4gICAgICBnbC50ZXhQYXJhbWV0ZXJpKFxyXG4gICAgICAgIGdsLlRFWFRVUkVfMkQsXHJcbiAgICAgICAgZ2wuVEVYVFVSRV9XUkFQX1QsXHJcbiAgICAgICAgZ2wuUkVQRUFUXHJcbiAgICAgICk7XHJcbiAgICAgIGdsLnRleFBhcmFtZXRlcmkoXHJcbiAgICAgICAgZ2wuVEVYVFVSRV8yRCxcclxuICAgICAgICBnbC5URVhUVVJFX01JTl9GSUxURVIsXHJcbiAgICAgICAgZ2wuTElORUFSX01JUE1BUF9MSU5FQVJcclxuICAgICAgKTtcclxuICAgICAgZ2wudGV4UGFyYW1ldGVyaShcclxuICAgICAgICBnbC5URVhUVVJFXzJELFxyXG4gICAgICAgIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUixcclxuICAgICAgICBnbC5MSU5FQVJcclxuICAgICAgKTtcclxuICAgIH07XHJcbiAgfVxyXG4gIGFwcGx5KHNoZCwgdGV4VW5pdCkge1xyXG4gICAgaWYgKHNoZCA9PSB1bmRlZmluZWQgfHwgc2hkLmlkID09IHVuZGVmaW5lZCB8fCBzaGQuaWQgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24oc2hkLmlkLCBcIlRleHR1cmUwXCIpO1xyXG4gICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCArIHRleFVuaXQpO1xyXG4gICAgZ2wuYmluZFRleHR1cmUodGhpcy50eXBlLCB0aGlzLmlkKTtcclxuICAgIGdsLnVuaWZvcm0xaShsb2MsIHRleFVuaXQpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRleHR1cmUoLi4uYXJncykge1xyXG4gIHJldHVybiBuZXcgX3RleHR1cmUoLi4uYXJncyk7XHJcbn1cclxuIiwiaW1wb3J0IHsgdmVjMywgdmVjMiwgdmVjNCB9IGZyb20gXCIuLi8uLi9tdGgvbXRoLmpzXCI7XHJcblxyXG5jbGFzcyBfdmVydGV4IHtcclxuICBjb25zdHJ1Y3RvcihwLCB0LCBuLCBjKSB7XHJcbiAgICBpZiAocCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdGhpcy5wID0gdmVjMygwKTtcclxuICAgICAgdGhpcy50ID0gdmVjMigwKTtcclxuICAgICAgdGhpcy5uID0gdmVjMygwKTtcclxuICAgICAgdGhpcy5jID0gdmVjNCgwKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMucCA9IHZlYzMocCk7XHJcbiAgICAgIHRoaXMudCA9IHZlYzIodCk7XHJcbiAgICAgIHRoaXMubiA9IHZlYzMobik7XHJcbiAgICAgIHRoaXMuYyA9IHZlYzQoYyk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmVydGV4KC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF92ZXJ0ZXgoLi4uYXJncyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRWZXJ0ZXhBcnJheShwb3NBcnJheSwgdGNBcnJheSwgbm9ybUFycmF5LCBjb2xBcnJheSkge1xyXG4gIGxldCB2ZXJ0ZXhBcnJheSA9IFtdO1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcG9zQXJyYXkubGVuZ3RoOyBpICs9IDMpIHtcclxuICAgIHZlcnRleEFycmF5LnB1c2goXHJcbiAgICAgIHZlcnRleChcclxuICAgICAgICBwb3NBcnJheSAhPSBudWxsXHJcbiAgICAgICAgICA/IHZlYzMocG9zQXJyYXlbaV0sIHBvc0FycmF5W2kgKyAxXSwgcG9zQXJyYXlbaSArIDJdKVxyXG4gICAgICAgICAgOiB2ZWMzKDApLFxyXG4gICAgICAgIHRjQXJyYXkgIT0gbnVsbCA/IHZlYzIodGNBcnJheVtpXSwgdGNBcnJheVtpICsgMV0pIDogdmVjMigwKSxcclxuICAgICAgICBub3JtQXJyYXkgIT0gbnVsbFxyXG4gICAgICAgICAgPyB2ZWMzKG5vcm1BcnJheVtpXSwgbm9ybUFycmF5W2kgKyAxXSwgbm9ybUFycmF5W2kgKyAyXSlcclxuICAgICAgICAgIDogdmVjMygwKSxcclxuICAgICAgICBjb2xBcnJheSAhPSBudWxsXHJcbiAgICAgICAgICA/IHZlYzQoY29sQXJyYXlbaV0sIGNvbEFycmF5W2kgKyAxXSwgY29sQXJyYXlbaSArIDJdLCBjb2xBcnJheVtpICsgM10pXHJcbiAgICAgICAgICA6IHZlYzQoMClcclxuICAgICAgKVxyXG4gICAgKTtcclxuICB9XHJcbiAgcmV0dXJuIHZlcnRleEFycmF5O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdG9BcnJheSh2ZXJ0ZXhBcnJheSkge1xyXG4gIGxldCBhID0gW107XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmVydGV4QXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIGEucHVzaCh2ZXJ0ZXhBcnJheVtpXS5wLngpO1xyXG4gICAgYS5wdXNoKHZlcnRleEFycmF5W2ldLnAueSk7XHJcbiAgICBhLnB1c2godmVydGV4QXJyYXlbaV0ucC56KTtcclxuICAgIGEucHVzaCh2ZXJ0ZXhBcnJheVtpXS50LngpO1xyXG4gICAgYS5wdXNoKHZlcnRleEFycmF5W2ldLnQueSk7XHJcbiAgICBhLnB1c2godmVydGV4QXJyYXlbaV0ubi54KTtcclxuICAgIGEucHVzaCh2ZXJ0ZXhBcnJheVtpXS5uLnkpO1xyXG4gICAgYS5wdXNoKHZlcnRleEFycmF5W2ldLm4ueik7XHJcbiAgICBhLnB1c2godmVydGV4QXJyYXlbaV0uYy54KTtcclxuICAgIGEucHVzaCh2ZXJ0ZXhBcnJheVtpXS5jLnkpO1xyXG4gICAgYS5wdXNoKHZlcnRleEFycmF5W2ldLmMueik7XHJcbiAgICBhLnB1c2godmVydGV4QXJyYXlbaV0uYy53KTtcclxuICB9XHJcbiAgcmV0dXJuIGE7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdXRvTm9ybWFscyh2ZXJ0ZXhBcnJheSwgaW5kZXhBcnJheSkge1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kZXhBcnJheS5sZW5ndGg7IGkgKz0gMykge1xyXG4gICAgbGV0IHAwID0gdmVydGV4QXJyYXlbaW5kZXhBcnJheVtpXV0sXHJcbiAgICAgIHAxID0gdmVydGV4QXJyYXlbaW5kZXhBcnJheVtpICsgMV1dLFxyXG4gICAgICBwMiA9IHZlcnRleEFycmF5W2luZGV4QXJyYXlbaSArIDJdXTtcclxuICAgIGNvbnN0IG5vcm1hbCA9IHAxLnAuc3ViKHAwLnApLmNyb3NzKHAyLnAuc3ViKHAwLnApKS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICBwMC5uID0gbm9ybWFsO1xyXG4gICAgcDEubiA9IG5vcm1hbDtcclxuICAgIHAyLm4gPSBub3JtYWw7XHJcbiAgICB2ZXJ0ZXhBcnJheVtpbmRleEFycmF5W2ldXSA9IHAwO1xyXG4gICAgdmVydGV4QXJyYXlbaW5kZXhBcnJheVtpICsgMV1dID0gcDE7XHJcbiAgICB2ZXJ0ZXhBcnJheVtpbmRleEFycmF5W2kgKyAyXV0gPSBwMjtcclxuICB9XHJcbiAgLy8gcmV0dXJuIHZlcnRleEFycmF5O1xyXG59XHJcbiIsIi8vIFByaW1pdGl2ZXMgaGFuZGxlIG1vZHVsZVxyXG5pbXBvcnQgeyBtYXQ0LCB2ZWMzLCB2ZWMyLCB2ZWM0IH0gZnJvbSBcIi4uLy4uL210aC9tdGguanNcIjtcclxuaW1wb3J0ICogYXMgbXRsIGZyb20gXCIuL3Jlcy9tYXRlcmlhbC5qc1wiO1xyXG5pbXBvcnQgeyBnbCB9IGZyb20gXCIuLi8uLi9nbC5qc1wiO1xyXG5pbXBvcnQgeyB2ZXJ0ZXgsIHRvQXJyYXksIGdldFZlcnRleEFycmF5LCBhdXRvTm9ybWFscyB9IGZyb20gXCIuL3ZlcnRleC5qc1wiO1xyXG5cclxuLy8gUHJpbWl0aXZlIGNsYXNzXHJcbmNsYXNzIF9wcmltIHtcclxuICBjb25zdHJ1Y3Rvcih0eXBlLCB2ZXJ0ZXhBcnJheSwgaW5kZXhBcnJheSwgbXRsTm8sIHNvY2tldElkKSB7XHJcbiAgICBpZiAodmVydGV4QXJyYXkgIT0gbnVsbCkge1xyXG4gICAgICAvLyBHZW5lcmF0ZSBhbmQgYmluZCB2ZXJ0ZXggYnVmZmVyXHJcbiAgICAgIHRoaXMudkJ1ZiA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy52QnVmKTtcclxuICAgICAgLy8gR2VuZXJhdGUgYW5kIGJpbmQgdmVydGV4IGFycmF5XHJcbiAgICAgIHRoaXMudkEgPSBnbC5jcmVhdGVWZXJ0ZXhBcnJheSgpO1xyXG4gICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy52QSk7XHJcblxyXG4gICAgICAvLyBVcGxvYWQgZGF0YVxyXG4gICAgICBnbC5idWZmZXJEYXRhKFxyXG4gICAgICAgIGdsLkFSUkFZX0JVRkZFUixcclxuICAgICAgICBuZXcgRmxvYXQzMkFycmF5KHZlcnRleEFycmF5KSxcclxuICAgICAgICBnbC5TVEFUSUNfRFJBV1xyXG4gICAgICApO1xyXG4gICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKDAsIDMsIGdsLkZMT0FULCBmYWxzZSwgNCAqIDEyLCAwKTtcclxuICAgICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcigxLCAyLCBnbC5GTE9BVCwgZmFsc2UsIDQgKiAxMiwgNCAqIDMpO1xyXG4gICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKDIsIDMsIGdsLkZMT0FULCBmYWxzZSwgNCAqIDEyLCA0ICogNSk7XHJcbiAgICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoMywgNCwgZ2wuRkxPQVQsIGZhbHNlLCA0ICogMTIsIDQgKiA4KTtcclxuICAgICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkoMCk7XHJcbiAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KDEpO1xyXG4gICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSgyKTtcclxuICAgICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkoMyk7XHJcbiAgICAgIGdsLmJpbmRWZXJ0ZXhBcnJheShudWxsKTtcclxuICAgIH1cclxuICAgIGlmIChpbmRleEFycmF5ICE9IG51bGwpIHtcclxuICAgICAgLy8gR2VuZXJhdGUgYW5kIGJpbmQgaW5kZXggYnVmZmVyXHJcbiAgICAgIHRoaXMuaUJ1ZiA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmlCdWYpO1xyXG5cclxuICAgICAgLy8gVXBsb2FkIGRhdGFcclxuICAgICAgZ2wuYnVmZmVyRGF0YShcclxuICAgICAgICBnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUixcclxuICAgICAgICBuZXcgSW50MzJBcnJheShpbmRleEFycmF5KSxcclxuICAgICAgICBnbC5TVEFUSUNfRFJBV1xyXG4gICAgICApO1xyXG4gICAgICB0aGlzLm51bU9mRWxlbWVudHMgPSBpbmRleEFycmF5Lmxlbmd0aDtcclxuICAgIH0gZWxzZSBpZiAoaW5kZXhBcnJheSA9PSBudWxsICYmIHZlcnRleEFycmF5ICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5udW1PZkVsZW1lbnRzID0gdmVydGV4QXJyYXkubGVuZ3RoO1xyXG4gICAgfSBlbHNlIHRoaXMubnVtT2ZFbGVtZW50cyA9IDA7XHJcbiAgICB0aGlzLnRyYW5zTWF0cml4ID0gbWF0NCgpO1xyXG4gICAgaWYgKHR5cGUgIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLm10bE5vID0gbXRsTm87XHJcbiAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgIHRoaXMuaWQgPSBzb2NrZXRJZDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFByaW1pdGl2ZSBkcmF3aW5nIGZ1bmN0aW9uXHJcbiAgZHJhdyh3b3JsZE1hdHJpeCkge1xyXG4gICAgaWYgKHdvcmxkTWF0cml4ID09IHVuZGVmaW5lZCkgd29ybGRNYXRyaXggPSBtYXQ0KCk7XHJcbiAgICBjb25zdCB3ID0gbWF0NCgpLm11bDIodGhpcy50cmFuc01hdHJpeCwgd29ybGRNYXRyaXgpO1xyXG4gICAgY29uc3Qgd2ludiA9IG1hdDQodykuaW52ZXJzZSgpLnRyYW5zcG9zZSgpO1xyXG4gICAgY29uc3Qgd3ZwID0gbWF0NCh3KS5tdWwod2luZG93LmFuaW0uY2FtZXJhLm1hdHJWUCk7XHJcblxyXG4gICAgY29uc3QgcHJvZ0lkID0gbXRsLm1hdGVyaWFsc1t0aGlzLm10bE5vXS5hcHBseSh0aGlzLm10bE5vKTtcclxuXHJcbiAgICBsZXQgbG9jO1xyXG4gICAgLy8gUGFzcyBtYXRyaWNlc1xyXG4gICAgaWYgKChsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ0lkLCBcIk1hdHJXXCIpKSAhPSAtMSlcclxuICAgICAgZ2wudW5pZm9ybU1hdHJpeDRmdihsb2MsIGZhbHNlLCBuZXcgRmxvYXQzMkFycmF5KHcudG9BcnJheSgpKSk7XHJcbiAgICBpZiAoKGxvYyA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9nSWQsIFwiTWF0cldJbnZcIikpICE9IC0xKVxyXG4gICAgICBnbC51bmlmb3JtTWF0cml4NGZ2KGxvYywgZmFsc2UsIG5ldyBGbG9hdDMyQXJyYXkod2ludi50b0FycmF5KCkpKTtcclxuICAgIGlmICgobG9jID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dJZCwgXCJNYXRyV1ZQXCIpKSAhPSAtMSlcclxuICAgICAgZ2wudW5pZm9ybU1hdHJpeDRmdihsb2MsIGZhbHNlLCBuZXcgRmxvYXQzMkFycmF5KHd2cC50b0FycmF5KCkpKTtcclxuXHJcbiAgICAvLyBQYXNzIG1hdGVyaWFsIGRhdGFcclxuICAgIGlmICgobG9jID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dJZCwgXCJLYVwiKSkgIT0gLTEpIHtcclxuICAgICAgbGV0IGthID0gbXRsLm1hdGVyaWFsc1t0aGlzLm10bE5vXS5rYTtcclxuICAgICAgZ2wudW5pZm9ybTNmKGxvYywga2EueCwga2EueSwga2Eueik7XHJcbiAgICB9XHJcbiAgICBpZiAoKGxvYyA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9nSWQsIFwiS2RcIikpICE9IC0xKSB7XHJcbiAgICAgIGxldCBrZCA9IG10bC5tYXRlcmlhbHNbdGhpcy5tdGxOb10ua2Q7XHJcbiAgICAgIGdsLnVuaWZvcm0zZihsb2MsIGtkLngsIGtkLnksIGtkLnopO1xyXG4gICAgfVxyXG4gICAgaWYgKChsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ0lkLCBcIktzXCIpKSAhPSAtMSkge1xyXG4gICAgICBsZXQga3MgPSBtdGwubWF0ZXJpYWxzW3RoaXMubXRsTm9dLmtzO1xyXG4gICAgICBnbC51bmlmb3JtM2YobG9jLCBrcy54LCBrcy55LCBrcy56KTtcclxuICAgIH1cclxuICAgIGlmICgobG9jID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dJZCwgXCJQaFwiKSkgIT0gLTEpXHJcbiAgICAgIGdsLnVuaWZvcm0xZihsb2MsIG10bC5tYXRlcmlhbHNbdGhpcy5tdGxOb10ucGgpO1xyXG5cclxuICAgIC8vIFBhc3MgdGltZVxyXG4gICAgaWYgKChsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ0lkLCBcIlRpbWVcIikpICE9IC0xKVxyXG4gICAgICBnbC51bmlmb3JtMWYobG9jLCB3aW5kb3cuYW5pbS50aW1lci5nbG9iYWxUaW1lKTtcclxuXHJcbiAgICAvLyBQYXNzIGNhbWVyYSBkYXRhXHJcbiAgICBpZiAoKGxvYyA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9nSWQsIFwiQ2FtTG9jXCIpKSAhPSAtMSlcclxuICAgICAgZ2wudW5pZm9ybTNmKFxyXG4gICAgICAgIGxvYyxcclxuICAgICAgICB3aW5kb3cuYW5pbS5jYW1lcmEubG9jLngsXHJcbiAgICAgICAgd2luZG93LmFuaW0uY2FtZXJhLmxvYy55LFxyXG4gICAgICAgIHdpbmRvdy5hbmltLmNhbWVyYS5sb2MuelxyXG4gICAgICApO1xyXG4gICAgaWYgKChsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ0lkLCBcIkNhbURpclwiKSkgIT0gLTEpXHJcbiAgICAgIGdsLnVuaWZvcm0zZihcclxuICAgICAgICBsb2MsXHJcbiAgICAgICAgd2luZG93LmFuaW0uY2FtZXJhLmRpci54LFxyXG4gICAgICAgIHdpbmRvdy5hbmltLmNhbWVyYS5kaXIueSxcclxuICAgICAgICB3aW5kb3cuYW5pbS5jYW1lcmEuZGlyLnpcclxuICAgICAgKTtcclxuXHJcbiAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy52QSk7XHJcbiAgICBpZiAodGhpcy5pQnVmICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmlCdWYpO1xyXG4gICAgICBnbC5kcmF3RWxlbWVudHModGhpcy50eXBlLCB0aGlzLm51bU9mRWxlbWVudHMsIGdsLlVOU0lHTkVEX0lOVCwgMCk7XHJcbiAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIG51bGwpO1xyXG4gICAgfSBlbHNlIGdsLmRyYXdBcnJheXModGhpcy50eXBlLCAwLCB0aGlzLm51bU9mRWxlbWVudHMpO1xyXG5cclxuICAgIGdsLmJpbmRWZXJ0ZXhBcnJheShudWxsKTtcclxuICB9XHJcblxyXG4gIC8vIFNwaGVyZSBjcmVhdGlvbiBmdW5jdGlvblxyXG4gIGNyZWF0ZVNwaGVyZShyYWRpdXMsIHdpZHRoLCBoZWlnaHQpIHtcclxuICAgIGxldCB2ZXJ0ZXhBcnJheSA9IFtdLFxyXG4gICAgICBpbmRleEFycmF5ID0gW107XHJcblxyXG4gICAgLy8gQ3JlYXRlIHZlcnRleCBhcnJheSBmb3Igc3BoZXJlXHJcbiAgICBmb3IgKFxyXG4gICAgICBsZXQgaSA9IDAsIGsgPSAwLCB0aGV0YSA9IDA7XHJcbiAgICAgIGkgPCBoZWlnaHQ7XHJcbiAgICAgIGkrKywgdGhldGEgKz0gTWF0aC5QSSAvIChoZWlnaHQgLSAxKVxyXG4gICAgKVxyXG4gICAgICBmb3IgKFxyXG4gICAgICAgIGxldCBqID0gMCwgcGhpID0gMDtcclxuICAgICAgICBqIDwgd2lkdGg7XHJcbiAgICAgICAgaisrLCBwaGkgKz0gKDIgKiBNYXRoLlBJKSAvICh3aWR0aCAtIDEpXHJcbiAgICAgICkge1xyXG4gICAgICAgIHZlcnRleEFycmF5W2srK10gPSB2ZXJ0ZXgoXHJcbiAgICAgICAgICB2ZWMzKFxyXG4gICAgICAgICAgICByYWRpdXMgKiBNYXRoLnNpbih0aGV0YSkgKiBNYXRoLnNpbihwaGkpLFxyXG4gICAgICAgICAgICByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSksXHJcbiAgICAgICAgICAgIHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKSAqIE1hdGguY29zKHBoaSlcclxuICAgICAgICAgICksXHJcbiAgICAgICAgICB2ZWMyKDApLFxyXG4gICAgICAgICAgdmVjMyhcclxuICAgICAgICAgICAgTWF0aC5zaW4odGhldGEpICogTWF0aC5zaW4ocGhpKSxcclxuICAgICAgICAgICAgTWF0aC5jb3ModGhldGEpLFxyXG4gICAgICAgICAgICBNYXRoLnNpbih0aGV0YSkgKiBNYXRoLmNvcyhwaGkpXHJcbiAgICAgICAgICApLFxyXG4gICAgICAgICAgdmVjNCgxLCAxLCAwLCAxKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgaW5kZXggYXJyYXkgZm9yIHNwaGVyZVxyXG4gICAgZm9yIChsZXQgayA9IDAsIGluZCA9IDAsIGkgPSAwOyBpIDwgaGVpZ2h0IC0gMTsgaSsrLCBpbmQrKylcclxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB3aWR0aCAtIDE7IGorKywgaW5kKyspIHtcclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQ7XHJcbiAgICAgICAgaW5kZXhBcnJheVtrKytdID0gaW5kICsgMTtcclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQgKyB3aWR0aDtcclxuXHJcbiAgICAgICAgaW5kZXhBcnJheVtrKytdID0gaW5kICsgd2lkdGggKyAxO1xyXG4gICAgICAgIGluZGV4QXJyYXlbaysrXSA9IGluZCArIDE7XHJcbiAgICAgICAgaW5kZXhBcnJheVtrKytdID0gaW5kICsgd2lkdGg7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgbmV3IHNwaGVyZSBwcmltaXRpdmVcclxuICAgIHJldHVybiBuZXcgcHJpbShcclxuICAgICAgZ2wuVFJJQU5HTEVTLFxyXG4gICAgICB0b0FycmF5KHZlcnRleEFycmF5KSxcclxuICAgICAgaW5kZXhBcnJheSxcclxuICAgICAgdGhpcy5tdGxObyxcclxuICAgICAgdGhpcy5pZFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIFRvcnVzIGNyZWF0aW9uIGZ1bmN0aW9uXHJcbiAgY3JlYXRlVG9ydXMocmFkaXVzSW5uZXIsIHJhZGl1c091dGhlciwgd2lkdGgsIGhlaWdodCkge1xyXG4gICAgbGV0IHZlcnRleEFycmF5ID0gW10sXHJcbiAgICAgIGluZGV4QXJyYXkgPSBbXTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdmVydGV4IGFycmF5IGZvciB0b3J1c1xyXG4gICAgZm9yIChcclxuICAgICAgbGV0IGkgPSAwLCBrID0gMCwgYWxwaGEgPSAwO1xyXG4gICAgICBpIDwgaGVpZ2h0O1xyXG4gICAgICBpKyssIGFscGhhICs9ICgyICogTWF0aC5QSSkgLyAoaGVpZ2h0IC0gMSlcclxuICAgIClcclxuICAgICAgZm9yIChcclxuICAgICAgICBsZXQgaiA9IDAsIHBoaSA9IDA7XHJcbiAgICAgICAgaiA8IHdpZHRoO1xyXG4gICAgICAgIGorKywgcGhpICs9ICgyICogTWF0aC5QSSkgLyAod2lkdGggLSAxKVxyXG4gICAgICApIHtcclxuICAgICAgICB2ZXJ0ZXhBcnJheVtrKytdID0gdmVydGV4KFxyXG4gICAgICAgICAgdmVjMyhcclxuICAgICAgICAgICAgKHJhZGl1c0lubmVyICsgcmFkaXVzT3V0aGVyICogTWF0aC5jb3MoYWxwaGEpKSAqIE1hdGguc2luKHBoaSksXHJcbiAgICAgICAgICAgIHJhZGl1c091dGhlciAqIE1hdGguc2luKGFscGhhKSxcclxuICAgICAgICAgICAgKHJhZGl1c0lubmVyICsgcmFkaXVzT3V0aGVyICogTWF0aC5jb3MoYWxwaGEpKSAqIE1hdGguY29zKHBoaSlcclxuICAgICAgICAgICksXHJcbiAgICAgICAgICB2ZWMyKDApLFxyXG4gICAgICAgICAgdmVjMyhcclxuICAgICAgICAgICAgTWF0aC5jb3MoYWxwaGEpICogTWF0aC5zaW4ocGhpKSxcclxuICAgICAgICAgICAgTWF0aC5zaW4oYWxwaGEpLFxyXG4gICAgICAgICAgICBNYXRoLmNvcyhhbHBoYSkgKiBNYXRoLmNvcyhwaGkpXHJcbiAgICAgICAgICApLFxyXG4gICAgICAgICAgdmVjNCgxLCAxLCAwLCAxKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgaW5kZXggYXJyYXkgZm9yIHRvcnVzXHJcbiAgICBmb3IgKGxldCBpID0gMCwgayA9IDAsIGluZCA9IDA7IGkgPCBoZWlnaHQgLSAxOyBpbmQrKywgaSsrKVxyXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHdpZHRoIC0gMTsgaisrLCBpbmQrKykge1xyXG4gICAgICAgIGluZGV4QXJyYXlbaysrXSA9IGluZDtcclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQgKyAxO1xyXG4gICAgICAgIGluZGV4QXJyYXlbaysrXSA9IGluZCArIHdpZHRoO1xyXG5cclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQgKyB3aWR0aCArIDE7XHJcbiAgICAgICAgaW5kZXhBcnJheVtrKytdID0gaW5kICsgMTtcclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQgKyB3aWR0aDtcclxuICAgICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBuZXcgdG9ydXMgcHJpbWl0aXZlXHJcbiAgICByZXR1cm4gbmV3IHByaW0oXHJcbiAgICAgIGdsLlRSSUFOR0xFUyxcclxuICAgICAgdG9BcnJheSh2ZXJ0ZXhBcnJheSksXHJcbiAgICAgIGluZGV4QXJyYXksXHJcbiAgICAgIHRoaXMubXRsTm8sXHJcbiAgICAgIHRoaXMuaWRcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBib3goYk1pbiwgYk1heCkge1xyXG4gICAgY29uc3QgcG9zaXRpb25zID0gW1xyXG4gICAgICBiTWF4LngsIGJNYXgueSwgYk1pbi56LCBcclxuICAgICAgYk1heC54LCBiTWF4LnksIGJNYXgueiwgXHJcbiAgICAgIGJNYXgueCwgYk1pbi55LCBiTWF4LnosIFxyXG4gICAgICBiTWF4LngsIGJNaW4ueSwgYk1pbi56LCBcclxuICAgICAgYk1pbi54LCBiTWF4LnksIGJNYXgueiwgXHJcbiAgICAgIGJNaW4ueCwgYk1heC55LCBiTWluLnosIFxyXG4gICAgICBiTWluLngsIGJNaW4ueSwgYk1pbi56LCBcclxuICAgICAgYk1pbi54LCBiTWluLnksIGJNYXgueiwgXHJcbiAgICAgIGJNaW4ueCwgYk1heC55LCBiTWF4LnosIFxyXG4gICAgICBiTWF4LngsIGJNYXgueSwgYk1heC56LCBcclxuICAgICAgYk1heC54LCBiTWF4LnksIGJNaW4ueiwgXHJcbiAgICAgIGJNaW4ueCwgYk1heC55LCBiTWluLnosXHJcbiAgICAgIGJNaW4ueCwgYk1pbi55LCBiTWluLnosXHJcbiAgICAgIGJNYXgueCwgYk1pbi55LCBiTWluLnosIFxyXG4gICAgICBiTWF4LngsIGJNaW4ueSwgYk1heC56LCBcclxuICAgICAgYk1pbi54LCBiTWluLnksIGJNYXgueiwgXHJcbiAgICAgIGJNYXgueCwgYk1heC55LCBiTWF4LnosIFxyXG4gICAgICBiTWluLngsIGJNYXgueSwgYk1heC56LCBcclxuICAgICAgYk1pbi54LCBiTWluLnksIGJNYXgueiwgXHJcbiAgICAgIGJNYXgueCwgYk1pbi55LCBiTWF4LnosIFxyXG4gICAgICBiTWluLngsIGJNYXgueSwgYk1pbi56LFxyXG4gICAgICBiTWF4LngsIGJNYXgueSwgYk1pbi56LCBcclxuICAgICAgYk1heC54LCBiTWluLnksIGJNaW4ueiwgXHJcbiAgICAgIGJNaW4ueCwgYk1pbi55LCBiTWluLnosXHJcbiAgICBdXHJcbiAgICBjb25zdCBpbmRpY2VzID0gW1xyXG4gICAgICAwLCAxLCAyLCAwLCAyLCAzLCA0LCA1LCA2LCA0LCA2LCA3LCA4LCA5LCAxMCwgOCwgMTAsIDExLCAxMiwgMTMsIDE0LFxyXG4gICAgICAxMiwgMTQsIDE1LCAxNiwgMTcsIDE4LCAxNiwgMTgsIDE5LCAyMCwgMjEsIDIyLCAyMCwgMjIsIDIzLFxyXG4gICAgXVxyXG5cclxuICAgIGxldCBib3hWZXJ0ZXhBcnJheSA9IGdldFZlcnRleEFycmF5KHBvc2l0aW9ucywgbnVsbCwgbnVsbCwgbnVsbCk7XHJcbiAgICBhdXRvTm9ybWFscyhib3hWZXJ0ZXhBcnJheSwgaW5kaWNlcyk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYm94VmVydGV4QXJyYXkpO1xyXG5cclxuICAgIHJldHVybiBuZXcgcHJpbShnbC5UUklBTkdMRVMsXHJcbiAgICAgIHRvQXJyYXkoYm94VmVydGV4QXJyYXkpLFxyXG4gICAgICBpbmRpY2VzLFxyXG4gICAgICB0aGlzLm10bE5vLFxyXG4gICAgICB0aGlzLmlkKTtcclxuICB9ICBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByaW0oLi4uYXJncykge1xyXG4gIHJldHVybiBuZXcgX3ByaW0oLi4uYXJncyk7XHJcbn1cclxuIiwiLy8gUmVuZGVyIGltcGxlbWVudGF0aW8gZmlsZVxyXG4vLyBpbXBvcnQgeyBtdGwsIHRleCwgc2hkIH0gZnJvbSBcIi4vcmVzL3Jlc291cmNlLmpzXCI7XHJcbmltcG9ydCAqIGFzIG10bCBmcm9tIFwiLi9yZXMvbWF0ZXJpYWwuanNcIjtcclxuaW1wb3J0ICogYXMgdGV4IGZyb20gXCIuL3Jlcy90ZXh0dXJlLmpzXCI7XHJcbmltcG9ydCAqIGFzIHNoZCBmcm9tIFwiLi9yZXMvc2hhZGVyLmpzXCI7XHJcbmltcG9ydCB7IHByaW0gfSBmcm9tIFwiLi9wcmltaXRpdmUuanNcIjtcclxuaW1wb3J0IHsgbWF0NCB9IGZyb20gXCIuLi8uLi9tdGgvbXRoLmpzXCI7XHJcbmltcG9ydCB7IHZlYzMgfSBmcm9tIFwiLi4vLi4vbXRoL210aC5qc1wiO1xyXG5pbXBvcnQgeyBjYW52YXMsIGdsIH0gZnJvbSBcIi4uLy4uL2dsLmpzXCI7XHJcblxyXG5leHBvcnQgbGV0IHdhbGxzID0gW107XHJcbmxldCBtYXplSCA9IDEwO1xyXG5sZXQgbWF6ZUZsb29yID0gMDtcclxuZXhwb3J0IGxldCBtYXplUG9zID0gW1xyXG4gIFt2ZWMzKC05LCBtYXplRmxvb3IsIC03KSwgdmVjMygtNSwgbWF6ZUgsIC02KV0sXHJcbiAgW3ZlYzMoLTYsIG1hemVGbG9vciwgLTkpLCB2ZWMzKC01LCBtYXplSCwgLTcpXSxcclxuIC8vIFt2ZWMzKC00LCBtYXplRmxvb3IsIC0yKSwgdmVjMygxLCBtYXplSCwgMildLFxyXG4gIFt2ZWMzKDMsIG1hemVGbG9vciwgLTExKSwgdmVjMyg0LCBtYXplSCwgLTIpXSxcclxuICBbdmVjMyg0LCBtYXplRmxvb3IsIC0zKSwgdmVjMyg5LCBtYXplSCwgLTIpXSxcclxuICBbdmVjMyg4LCBtYXplRmxvb3IsIC04KSwgdmVjMyg5LCBtYXplSCwgLTMpXSxcclxuICBbdmVjMyg5LCBtYXplRmxvb3IsIC04KSwgdmVjMygxMSwgbWF6ZUgsIC03KV0sXHJcbiAgW3ZlYzMoNCwgbWF6ZUZsb29yLCAtMTEpLCB2ZWMzKDExLCBtYXplSCwgLTEwKV0sXHJcbiAgW3ZlYzMoNiwgbWF6ZUZsb29yLCA1KSwgdmVjMyg3LCBtYXplSCwgMTApXSxcclxuICBbdmVjMyg0LCBtYXplRmxvb3IsIDcpLCB2ZWMzKDYsIG1hemVILCA4KV0sXHJcbiAgW3ZlYzMoNywgbWF6ZUZsb29yLCA3KSwgdmVjMyg5LCBtYXplSCwgOCldLFxyXG4gIFt2ZWMzKC01LCBtYXplRmxvb3IsIDcpLCB2ZWMzKC0zLCBtYXplSCwgOCldLFxyXG4gIFt2ZWMzKC02LCBtYXplRmxvb3IsIDYpLCB2ZWMzKC01LCBtYXplSCwgOSldLFxyXG4gIFt2ZWMzKC04LCBtYXplRmxvb3IsIDgpLCB2ZWMzKC02LCBtYXplSCwgMTApXSxcclxuICBbdmVjMygtMTEsIG1hemVGbG9vciwgMTApLCB2ZWMzKC02LCBtYXplSCwgMTIpXSxcclxuICBbdmVjMygtMTIsIG1hemVGbG9vciwgMTApLCB2ZWMzKC0xMSwgbWF6ZUgsIDExKV0sXHJcbl07XHJcblxyXG5leHBvcnQgY2xhc3MgUmVuZGVyIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIGdsLmNsZWFyQ29sb3IoMC4zLCAwLjQ3LCAwLjgsIDEpO1xyXG4gICAgZ2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCk7XHJcblxyXG4gICAgdGhpcy5zaGFkZXJEZWZhdWx0ID0gc2hkLnNoYWRlcihcImRlZmF1bHRcIik7XHJcbiAgICB0aGlzLnNoYWRlclNjb3BlID0gc2hkLnNoYWRlcihcInNjb3BlXCIpO1xyXG4gIH1cclxuXHJcbiAgcmVzSW5pdCgpIHtcclxuICAgIHRoaXMubWF0ZXJpYWwgPSBtdGwubWF0ZXJpYWwoKTtcclxuICAgIHRoaXMubWF0ZXJpYWxTY29wZSA9IG10bC5tYXRlcmlhbChcclxuICAgICAgXCJTY29wZSBtYXRlcmlhbFwiLFxyXG4gICAgICB2ZWMzKDEsIDAsIDApLFxyXG4gICAgICB2ZWMzKDEsIDAsIDApLFxyXG4gICAgICB2ZWMzKDEsIDAsIDApLFxyXG4gICAgICAzMC4wLFxyXG4gICAgICAxLFxyXG4gICAgICBudWxsLFxyXG4gICAgICBzaGQuc2hhZGVyc1sxXVxyXG4gICAgKTtcclxuICAgIHRoaXMudGV4dHVyZSA9IHRleC50ZXh0dXJlKCk7XHJcbiAgICBjb25zdCB4ID0gMC4wMSAqIGNhbnZhcy5jbGllbnRIZWlnaHQgLyBjYW52YXMuY2xpZW50V2lkdGg7XHJcbiAgICBjb25zdCB5ID0gMC4wMTtcclxuICAgIHRoaXMuc2NvcGVQcmltID0gcHJpbShcclxuICAgICAgZ2wuVFJJQU5HTEVfU1RSSVAsXHJcbiAgICAgIG5ldyBGbG9hdDMyQXJyYXkoW1xyXG4gICAgICAgIC14LFxyXG4gICAgICAgIHksXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAteCxcclxuICAgICAgICAteSxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIHgsXHJcbiAgICAgICAgeSxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIHgsXHJcbiAgICAgICAgLXksXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgXSksXHJcbiAgICAgIG51bGwsXHJcbiAgICAgIHRoaXMubWF0ZXJpYWxTY29wZS5tdGxOb1xyXG4gICAgKTtcclxuICAgIHRoaXMub3RoZXJQcmltaXRpdmVzID0gW107XHJcblxyXG4gICAgbXRsLmxvYWRNdGxMaWIoKTtcclxuICAgIGZvciAobGV0IHggPSAwOyB4IDwgbWF6ZVBvcy5sZW5ndGg7IHgrKykge1xyXG4gICAgICBtYXplUG9zW3hdWzBdID0gbWF6ZVBvc1t4XVswXS5tdWwoNSk7XHJcbiAgICAgIG1hemVQb3NbeF1bMF0ueSAtPSAzO1xyXG4gICAgICBtYXplUG9zW3hdWzFdID0gbWF6ZVBvc1t4XVsxXS5tdWwoNSk7XHJcbiAgICAgIHdhbGxzLnB1c2gocHJpbShnbC5UUklBTkdMRVMsIG51bGwsIG51bGwsIG10bC5maW5kTXRsQnlOYW1lKFwiT2JzaWRpYW5cIikubXRsTm8sIHgpLmJveChtYXplUG9zW3hdWzBdLCBtYXplUG9zW3hdWzFdKSk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmZsb29yID0gcHJpbShnbC5UUklBTkdMRVMsIG51bGwsIG51bGwsIG10bC5maW5kTXRsQnlOYW1lKFwiT2JzaWRpYW5cIikubXRsTm8sIHgpLmJveCh2ZWMzKC0zMDAsIC02LCAtMzAwKSwgdmVjMygzMDAsIC0zLCAzMDApKTtcclxuXHJcbiAgICBpZiAod2luZG93Lm90aGVyUGxheWVycyAhPT0gbnVsbCkge1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdpbmRvdy5vdGhlclBsYXllcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBsZXQgdG1wUHJpbSA9IHByaW0oZ2wuVFJJQU5HTEVTLCBudWxsLCBudWxsLCBtdGwuZmluZE10bEJ5TmFtZSh3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLmNvbG9yKS5tdGxObywgd2luZG93Lm90aGVyUGxheWVyc1tpXS5pZCkuY3JlYXRlU3BoZXJlKDMsIDEwMiwgMTAyKTtcclxuICAgICAgICB0aGlzLm90aGVyUHJpbWl0aXZlcy5wdXNoKHRtcFByaW0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjcmVhdGVTZWxmSWZOb3RFeGlzdHMoKSB7XHJcbiAgICBpZiAod2luZG93LnBsYXllciAhPT0gbnVsbCAmJiB0aGlzLnBsYXllclByaW1pdGl2ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHRoaXMucGxheWVyUHJpbWl0aXZlID0gcHJpbShnbC5UUklBTkdMRVMsIG51bGwsIG51bGwsIG10bC5maW5kTXRsQnlOYW1lKHdpbmRvdy5wbGF5ZXIuY29sb3IpLm10bE5vLCB3aW5kb3cucGxheWVyLmlkKS5jcmVhdGVTcGhlcmUoMywgMTAyLCAxMDIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0QnlJZChvYmopIHtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5vdGhlclByaW1pdGl2ZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgaWYgKHRoaXMub3RoZXJQcmltaXRpdmVzW2ldLmlkID09PSBvYmopIHtcclxuICAgICAgICByZXR1cm4gaTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIC0xO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlUGxheWVycygpIHtcclxuICAgIGlmICh3aW5kb3cub3RoZXJQbGF5ZXJzICE9PSBudWxsKSB7XHJcbiAgICAgIC8vYWRkXHJcbiAgICAgIGlmICh0aGlzLm90aGVyUHJpbWl0aXZlcy5sZW5ndGggPCB3aW5kb3cub3RoZXJQbGF5ZXJzLmxlbmd0aCkge1xyXG4gICAgICAgIGxldCBuYW1lcyA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdpbmRvdy5vdGhlclBsYXllcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgIGxldCBmbGFnID0gMDtcclxuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGhpcy5vdGhlclByaW1pdGl2ZXMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgIGlmICh0aGlzLm90aGVyUHJpbWl0aXZlc1tqXS5pZCA9PT0gd2luZG93Lm90aGVyUGxheWVyc1tpXS5pZCkge1xyXG4gICAgICAgICAgICAgIGZsYWcgPSAxO1xyXG4gICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGZsYWcgPT09IDApIHtcclxuICAgICAgICAgICAgbmFtZXMucHVzaCh3aW5kb3cub3RoZXJQbGF5ZXJzW2ldKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGcgPSAwOyBnIDwgbmFtZXMubGVuZ3RoOyBnKyspIHtcclxuICAgICAgICAgIGxldCB0bXBQciA9IHByaW0oZ2wuVFJJQU5HTEVTLCBudWxsLCBudWxsLCBtdGwuZmluZE10bEJ5TmFtZShuYW1lc1tnXS5jb2xvcikubXRsTm8sIG5hbWVzW2ddLmlkKS5jcmVhdGVTcGhlcmUoMywgMTAyLCAxMDIpO1xyXG4gICAgICAgICAgdGhpcy5vdGhlclByaW1pdGl2ZXMucHVzaCh0bXBQcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvL2RlbGV0ZVxyXG4gICAgICBpZiAodGhpcy5vdGhlclByaW1pdGl2ZXMubGVuZ3RoID4gd2luZG93Lm90aGVyUGxheWVycy5sZW5ndGgpIHtcclxuICAgICAgICBsZXQgYnVmID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLm90aGVyUHJpbWl0aXZlcy5sZW5ndGg7IHgrKykge1xyXG4gICAgICAgICAgbGV0IGZsZyA9IDA7XHJcbiAgICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHdpbmRvdy5vdGhlclBsYXllcnMubGVuZ3RoOyB5KyspIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3RoZXJQcmltaXRpdmVzW3hdLmlkID09PSB3aW5kb3cub3RoZXJQbGF5ZXJzW3ldLmlkKSB7XHJcbiAgICAgICAgICAgICAgZmxnID0gMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGZsZyA9PT0gMCkge1xyXG4gICAgICAgICAgICBidWYucHVzaCh4KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHogPSAwOyB6IDwgYnVmLmxlbmd0aDsgeisrKSB7XHJcbiAgICAgICAgICB0aGlzLm90aGVyUHJpbWl0aXZlcy5zcGxpY2UoYnVmW3pdLCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGRyYXdXYWxscygpIHtcclxuICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2FsbHMubGVuZ3RoOyB4KyspIHtcclxuICAgICAgd2FsbHNbeF0uZHJhdygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZHJhd1NlbGYoKSB7XHJcbiAgICAvLyBEcmF3IHBsYXllciBwdGltaXRpdmVcclxuICAgIGlmICh3aW5kb3cucGxheWVyICE9PSBudWxsKSB7XHJcbiAgICAgIHRoaXMucGxheWVyUHJpbWl0aXZlLmRyYXcobWF0NCgpLnNldFRyYW5zbGF0ZSh3aW5kb3cucGxheWVyLngsIHdpbmRvdy5wbGF5ZXIueSwgd2luZG93LnBsYXllci56KSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBkcmF3T3RoZXIoKSB7XHJcbiAgICAvLyBEcmF3IG90aGVyIHByaW1pdGl2ZXNcclxuICAgIGlmICh3aW5kb3cub3RoZXJQbGF5ZXJzICE9PSBudWxsKSB7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2luZG93Lm90aGVyUGxheWVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMub3RoZXJQcmltaXRpdmVzW3RoaXMuZ2V0QnlJZCh3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLmlkKV0uZHJhdyhtYXQ0KCkuc2V0VHJhbnNsYXRlKHdpbmRvdy5vdGhlclBsYXllcnNbaV0ueCwgd2luZG93Lm90aGVyUGxheWVyc1tpXS55LCB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLnopKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbGF0ZW50Q2FtZXJhKCkge1xyXG4gICAgaWYgKHdpbmRvdy5wbGF5ZXIgIT0gbnVsbCkge1xyXG4gICAgICBsZXQgcG9zID0gdmVjMyh3aW5kb3cucGxheWVyLngsIHdpbmRvdy5wbGF5ZXIueSwgd2luZG93LnBsYXllci56KTtcclxuICAgICAgbGV0IGRpciA9IHZlYzMoMCwgMCwgLTEpLm5vcm1hbGl6ZSgpO1xyXG4gICAgICBsZXQgbm9ybSA9IHZlYzMoMCwgMSwgMCk7XHJcbiAgICAgIGxldCBjYW1PbGQgPSB2ZWMzKHdpbmRvdy5hbmltLmNhbWVyYS5sb2MpO1xyXG4gICAgICBsZXQgY2FtTmV3ID0gcG9zLmFkZChkaXIubXVsKC0xOCkuYWRkKG5vcm0ubXVsKDgpKSk7XHJcbiAgICAgIHdpbmRvdy5hbmltLmNhbWVyYS5zZXQoXHJcbiAgICAgICAgY2FtT2xkLmFkZChcclxuICAgICAgICAgIGNhbU5ldy5zdWIoY2FtT2xkKS5tdWwoTWF0aC5zcXJ0KHdpbmRvdy5hbmltLnRpbWVyLmdsb2JhbERlbHRhVGltZSkpXHJcbiAgICAgICAgKSxcclxuICAgICAgICBwb3MuYWRkKGRpci5tdWwoMTgpKS5hZGQobm9ybS5tdWwoLTgpKSxcclxuICAgICAgICBub3JtXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZW5kZXIoKSB7XHJcbiAgICBnbC5jbGVhckNvbG9yKDAuMywgMC40NywgMC44LCAxKTtcclxuICAgIGdsLmNsZWFyKGdsLkNPTE9SX0JVRkZFUl9CSVQpO1xyXG4gICAgZ2wuZW5hYmxlKGdsLkRFUFRIX1RFU1QpO1xyXG5cclxuXHJcbiAgICB0aGlzLmZsb29yLmRyYXcoKTtcclxuICAgIHRoaXMuZHJhd1dhbGxzKCk7XHJcbiAgICB0aGlzLmNyZWF0ZVNlbGZJZk5vdEV4aXN0cygpO1xyXG5cclxuICAgIC8vIERyYXcgcGxheWVyc1xyXG4gICAgdGhpcy51cGRhdGVQbGF5ZXJzKCk7XHJcbiAgICB0aGlzLmRyYXdTZWxmKCk7XHJcbiAgICB0aGlzLmRyYXdPdGhlcigpO1xyXG5cclxuICAgIC8vIERyYXcgc2NvcGVcclxuICAgIHRoaXMuc2NvcGVQcmltLmRyYXcoKTtcclxuICB9XHJcbn1cclxuIiwiLy8gQ29sbGlzaW9uIGRldGVjdGlvbiBpbXBsZW1lbnRhdGlvbiBmaWxlXHJcbmltcG9ydCB7IHZlYzMgfSBmcm9tIFwiLi92ZWMzLmpzXCI7XHJcblxyXG4vLyBSYXkgY2xhc3MgbW9kdWxlXHJcbmNsYXNzIF9yYXkge1xyXG4gIGNvbnN0cnVjdG9yKG9yZywgZGlyKSB7XHJcbiAgICB0aGlzLm9yZyA9IHZlYzMob3JnKTtcclxuICAgIHRoaXMuZGlyID0gdmVjMyhkaXIpLm5vcm1hbGl6ZSgpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJheSguLi5hcmdzKSB7XHJcbiAgcmV0dXJuIG5ldyBfcmF5KC4uLmFyZ3MpO1xyXG59XHJcblxyXG4vLyBTcGhlcmUgY2xhc3MgbW9kdWxlXHJcbmNsYXNzIF9zcGhlcmUge1xyXG4gIGNvbnN0cnVjdG9yKGNlbnRlciwgcmFkaXVzKSB7XHJcbiAgICB0aGlzLmMgPSBjZW50ZXI7XHJcbiAgICB0aGlzLnIgPSByYWRpdXM7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3BoZXJlKC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF9zcGhlcmUoLi4uYXJncyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByYXlJbnRlcnNlY3RTcGhlcmUocmF5LCBzcGhlcmUpIHtcclxuICBjb25zdCBvcmdDZW50ZXIgPSBzcGhlcmUuYy5zdWIocmF5Lm9yZyk7XHJcbiAgY29uc3QgdCA9IG9yZ0NlbnRlci5kb3QocmF5LmRpcik7XHJcbiAgY29uc3QgZDIgPSBvcmdDZW50ZXIubGVuZ3RoMigpIC0gdCAqIHQ7XHJcblxyXG4gIGlmIChvcmdDZW50ZXIuZG90KHJheS5kaXIpIDw9IDApIHJldHVybiBmYWxzZTtcclxuICBpZiAoZDIgPj0gc3BoZXJlLnIgKiBzcGhlcmUucikgcmV0dXJuIGZhbHNlO1xyXG5cclxuICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrQ29sbGlzaW9uU3BoZXJlQW5kU3BoZXJlKHBvczEsIHJhZDEsIHBvczIsIHJhZDIpIHtcclxuICBpZiAoTWF0aC5wb3cocG9zMi54IC0gcG9zMS54LCAyKSArIE1hdGgucG93KHBvczIueSAtIHBvczEueSwgMikgKyBNYXRoLnBvdyhwb3MyLnogLSBwb3MxLnosIDIpIDw9IE1hdGgucG93KHJhZDEgKyByYWQyLCAyKSkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjaGVja0NvbGxpc2lvblNwaGVyZUFuZEJveChibWluLCBibWF4LCBjLCByKSB7XHJcbiAgbGV0IHIyID0gciAqIHI7XHJcbiAgbGV0IGRtaW4gPSAwO1xyXG5cclxuICBjID0gW2MueCwgYy55LCBjLnpdO1xyXG4gIGJtaW4gPSBbYm1pbi54LCBibWluLnksIGJtaW4uel07XHJcbiAgYm1heCA9IFtibWF4LngsIGJtYXgueSwgYm1heC56XTtcclxuXHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuICAgIGlmIChjW2ldIDwgYm1pbltpXSkge1xyXG4gICAgICBkbWluICs9IE1hdGgucG93KGNbaV0gLSBibWluW2ldLCAyKTtcclxuICAgIH0gZWxzZSBpZiAoY1tpXSA+IGJtYXhbaV0pIHtcclxuICAgICAgZG1pbiArPSBNYXRoLnBvdyhjW2ldIC0gYm1heFtpXSwgMik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoZG1pbiA8PSByMikge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZTtcclxufVxyXG4iLCIvLyBJbnB1dCBzeXN0ZW0gaW1wbGVtZW50YXRpb24gZmlsZVxyXG5pbXBvcnQgeyB2ZWMzIH0gZnJvbSBcIi4uL210aC92ZWMzLmpzXCI7XHJcbmltcG9ydCB7IG1hdDQgfSBmcm9tIFwiLi4vbXRoL21hdDQuanNcIjtcclxuaW1wb3J0IHsgcmF5SW50ZXJzZWN0U3BoZXJlLCByYXksIHNwaGVyZSB9IGZyb20gXCIuLi9tdGgvY29sbGlzaW9uLmpzXCI7XHJcbmltcG9ydCAqIGFzIGNvbCBmcm9tIFwiLi4vbXRoL2NvbGxpc2lvbi5qc1wiO1xyXG5pbXBvcnQge3dhbGxzLCBtYXplUG9zfSBmcm9tIFwiLi4vYW5pbS9ybmQvcmVuZGVyLmpzXCI7XHJcblxyXG5jbGFzcyBfY29udHJvbCB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLmRpciA9IHZlYzMoMCwgMCwgLTEpO1xyXG4gICAgdGhpcy5wb3MgPSB2ZWMzKDApO1xyXG4gICAgdGhpcy5wb3NPbGQgPSB2ZWMzKDApO1xyXG4gICAgdGhpcy5kZWx0YVBvcyA9IHZlYzMoMCk7XHJcbiAgICB0aGlzLm5vcm0gPSB2ZWMzKDAsIDEsIDApO1xyXG4gICAgdGhpcy5yaWdodCA9IHZlYzMoMSwgMCwgMCk7XHJcbiAgICB0aGlzLnNwZWVkID0gNTMuMDtcclxuICB9XHJcbiAgcmVzcG9uc2UoKSB7XHJcbiAgICB0aGlzLmRpciA9IHRoaXMuZGlyXHJcbiAgICAgIC5tdWxNYXRyKFxyXG4gICAgICAgIG1hdDQoKVxyXG4gICAgICAgICAgLnJvdGF0ZVkod2luZG93LmFuaW0udGltZXIuZ2xvYmFsRGVsdGFUaW1lICogLTE4ICogd2luZG93Lm1vdXNlRHgpXHJcbiAgICAgICAgICAucm90YXRlKFxyXG4gICAgICAgICAgICB3aW5kb3cuYW5pbS50aW1lci5nbG9iYWxEZWx0YVRpbWUgKiAtMC4xICogd2luZG93Lm1vdXNlRHksXHJcbiAgICAgICAgICAgIHRoaXMucmlnaHRcclxuICAgICAgICAgIClcclxuICAgICAgKVxyXG4gICAgICAubm9ybWFsaXplKCk7XHJcblxyXG4gICAgaWYgKHdpbmRvdy5wbGF5ZXIgIT09IG51bGwpIHtcclxuICAgICAgdGhpcy5kZWx0YVBvcyA9IHZlYzMoMCk7XHJcbiAgICAgIGlmICh3aW5kb3cuYWN0aXZlQnV0dG9ucy5pbmNsdWRlcyhcIktleVdcIikpIHtcclxuICAgICAgICB0aGlzLmRlbHRhUG9zID0gdGhpcy5kaXIubXVsKFxyXG4gICAgICAgICAgd2luZG93LmFuaW0udGltZXIuZ2xvYmFsRGVsdGFUaW1lICogdGhpcy5zcGVlZFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy5kZWx0YVBvcy55ID0gMDtcclxuICAgICAgfVxyXG4gICAgICBpZiAod2luZG93LmFjdGl2ZUJ1dHRvbnMuaW5jbHVkZXMoXCJLZXlTXCIpKSB7XHJcbiAgICAgICAgdGhpcy5kZWx0YVBvcyA9IHRoaXMuZGlyLm11bChcclxuICAgICAgICAgIC13aW5kb3cuYW5pbS50aW1lci5nbG9iYWxEZWx0YVRpbWUgKiB0aGlzLnNwZWVkXHJcbiAgICAgICAgKTtcclxuICAgICAgICB0aGlzLmRlbHRhUG9zLnkgPSAwO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh3aW5kb3cuYWN0aXZlQnV0dG9ucy5pbmNsdWRlcyhcIktleURcIikpIHtcclxuICAgICAgICB0aGlzLmRlbHRhUG9zID0gdGhpcy5kaXJcclxuICAgICAgICAgIC5jcm9zcyh0aGlzLm5vcm0pXHJcbiAgICAgICAgICAubXVsKHdpbmRvdy5hbmltLnRpbWVyLmdsb2JhbERlbHRhVGltZSAqIHRoaXMuc3BlZWQgLyAzLjApO1xyXG4gICAgICAgIHRoaXMuZGVsdGFQb3MueSA9IDA7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHdpbmRvdy5hY3RpdmVCdXR0b25zLmluY2x1ZGVzKFwiS2V5QVwiKSkge1xyXG4gICAgICAgIHRoaXMuZGVsdGFQb3MgPSB0aGlzLmRpclxyXG4gICAgICAgICAgLmNyb3NzKHRoaXMubm9ybSlcclxuICAgICAgICAgIC5tdWwoLXdpbmRvdy5hbmltLnRpbWVyLmdsb2JhbERlbHRhVGltZSAqIHRoaXMuc3BlZWQgLyAzLjApO1xyXG4gICAgICAgIHRoaXMuZGVsdGFQb3MueSA9IDA7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHdpbmRvdy5pc0NsaWNrZWQpIHtcclxuICAgICAgICBsZXQgciA9IHJheSh3aW5kb3cuYW5pbS5jYW1lcmEubG9jLCB3aW5kb3cuYW5pbS5jYW1lcmEuZGlyKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdpbmRvdy5vdGhlclBsYXllcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgIGxldCBzcGggPSBzcGhlcmUoXHJcbiAgICAgICAgICAgIHZlYzMoXHJcbiAgICAgICAgICAgICAgd2luZG93Lm90aGVyUGxheWVyc1tpXS54LFxyXG4gICAgICAgICAgICAgIHdpbmRvdy5vdGhlclBsYXllcnNbaV0ueSxcclxuICAgICAgICAgICAgICB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLnpcclxuICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgMy4wXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgaWYgKHJheUludGVyc2VjdFNwaGVyZShyLCBzcGgpKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5zb2NrZXQuZW1pdChcclxuICAgICAgICAgICAgICBcIk1UUzpQbGF5ZXJfU2hvb3RfUGxheWVyXCIsXHJcbiAgICAgICAgICAgICAgW1xyXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkod2luZG93LnBsYXllciksXHJcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh3aW5kb3cub3RoZXJQbGF5ZXJzW2ldKSxcclxuICAgICAgICAgICAgICBdLmpvaW4oXCJ8XCIpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB0aGlzLnBvcyA9IHRoaXMucG9zT2xkLmFkZCh0aGlzLmRlbHRhUG9zKTtcclxuICAgICAgdGhpcy5yaWdodCA9IHRoaXMuZGlyLmNyb3NzKHRoaXMubm9ybSkubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICBsZXQgZmxhZyA9IDA7XHJcblxyXG4gICAgICAvL2NoZWNrIGNvbGxpc2lvbiBwbGF5ZXItb3RoZXIgcGxheWVyc1xyXG4gICAgICBpZiAod2luZG93Lm90aGVyUGxheWVycyAhPT0gbnVsbCkge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2luZG93Lm90aGVyUGxheWVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgaWYgKGNvbC5jaGVja0NvbGxpc2lvblNwaGVyZUFuZFNwaGVyZSh2ZWMzKHRoaXMucG9zLngsIHRoaXMucG9zLnksIHRoaXMucG9zLnopLCAzLCB2ZWMzKHdpbmRvdy5vdGhlclBsYXllcnNbaV0ueCwgd2luZG93Lm90aGVyUGxheWVyc1tpXS55LCB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLnopLCAzKSkge1xyXG4gICAgICAgICAgICB3aGlsZShjb2wuY2hlY2tDb2xsaXNpb25TcGhlcmVBbmRTcGhlcmUodmVjMyh0aGlzLnBvcy54LCB0aGlzLnBvcy55LCB0aGlzLnBvcy56KSwgMywgdmVjMyh3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLngsIHdpbmRvdy5vdGhlclBsYXllcnNbaV0ueSwgd2luZG93Lm90aGVyUGxheWVyc1tpXS56KSwgMykpIHtcclxuICAgICAgICAgICAgICBpZiAoTWF0aC5hYnModGhpcy5kZWx0YVBvcy54KSA9PT0gMCAmJiBNYXRoLmFicyh0aGlzLmRlbHRhUG9zLnkpID09PSAwICYmIE1hdGguYWJzKHRoaXMuZGVsdGFQb3MueikgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVsdGFQb3MueCA9IDE7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucG9zID0gdGhpcy5wb3Muc3ViKHRoaXMuZGVsdGFQb3MpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy9jaGVjayBjb2xsaXNpb24gcGxheWVyLXdhbGxzXHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2FsbHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoY29sLmNoZWNrQ29sbGlzaW9uU3BoZXJlQW5kQm94KG1hemVQb3NbaV1bMF0sIG1hemVQb3NbaV1bMV0sIHZlYzModGhpcy5wb3MueCwgdGhpcy5wb3MueSwgdGhpcy5wb3MueiksIDMpKSB7XHJcbiAgICAgICAgICB3aGlsZShjb2wuY2hlY2tDb2xsaXNpb25TcGhlcmVBbmRCb3gobWF6ZVBvc1tpXVswXSwgbWF6ZVBvc1tpXVsxXSwgdmVjMyh0aGlzLnBvcy54LCB0aGlzLnBvcy55LCB0aGlzLnBvcy56KSwgMykpIHtcclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHRoaXMuZGVsdGFQb3MueCkgPT09IDAgJiYgTWF0aC5hYnModGhpcy5kZWx0YVBvcy55KSA9PT0gMCAmJiBNYXRoLmFicyh0aGlzLmRlbHRhUG9zLnopID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgdGhpcy5kZWx0YVBvcy54ID0gMTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICB0aGlzLnBvcyA9IHRoaXMucG9zLnN1Yih0aGlzLmRlbHRhUG9zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5wb3NPbGQgPSB0aGlzLnBvcztcclxuICAgICAgaWYgKGZsYWcgPT09IDApIHtcclxuICAgICAgICB3aW5kb3cucGxheWVyLnggPSB0aGlzLnBvcy54O1xyXG4gICAgICAgIHdpbmRvdy5wbGF5ZXIueSA9IHRoaXMucG9zLnk7XHJcbiAgICAgICAgd2luZG93LnBsYXllci56ID0gdGhpcy5wb3MuejtcclxuXHJcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyh0aGlzLmRpcik7XHJcbiAgICAgICAgbGV0IGNhbU9sZCA9IHZlYzMod2luZG93LmFuaW0uY2FtZXJhLmxvYyk7XHJcbiAgICAgICAgbGV0IGNhbU5ldyA9IHRoaXMucG9zLmFkZCh0aGlzLmRpci5tdWwoLTE4KS5hZGQodGhpcy5ub3JtLm11bCg4KSkpO1xyXG4gICAgICAgIHdpbmRvdy5hbmltLmNhbWVyYS5zZXQoXHJcbiAgICAgICAgICBjYW1PbGQuYWRkKFxyXG4gICAgICAgICAgICBjYW1OZXdcclxuICAgICAgICAgICAgICAuc3ViKGNhbU9sZClcclxuICAgICAgICAgICAgICAubXVsKFxyXG4gICAgICAgICAgICAgICAgTWF0aC5zcXJ0KFxyXG4gICAgICAgICAgICAgICAgICB3aW5kb3cubW91c2VEeCArIHdpbmRvdy5tb3VzZUR5ICE9IG51bGxcclxuICAgICAgICAgICAgICAgICAgICA/IHdpbmRvdy5hbmltLnRpbWVyLmdsb2JhbERlbHRhVGltZSAqIDAuNVxyXG4gICAgICAgICAgICAgICAgICAgIDogMVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICksXHJcbiAgICAgICAgICB0aGlzLnBvc1xyXG4gICAgICAgICAgICAuYWRkKHRoaXMuZGlyLm11bCgxOCkpXHJcbiAgICAgICAgICAgIC5hZGQodGhpcy5ub3JtLm11bCgwLjUzKSlcclxuICAgICAgICAgICAgLmFkZCh0aGlzLmRpci5jcm9zcyh0aGlzLm5vcm0pLm11bCgtMTApKSxcclxuICAgICAgICAgIHRoaXMubm9ybVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgICAgd2luZG93LnNvY2tldC5lbWl0KFxyXG4gICAgICAgIFwiTVRTOkNoYW5nZV9QbGF5ZXJfU3RhdGVcIixcclxuICAgICAgICBKU09OLnN0cmluZ2lmeSh3aW5kb3cucGxheWVyKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgd2luZG93Lm1vdXNlRHggPSAwO1xyXG4gICAgd2luZG93Lm1vdXNlRHkgPSAwO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbnRyb2woLi4uYXJncykge1xyXG4gIHJldHVybiBuZXcgX2NvbnRyb2woLi4uYXJncyk7XHJcbn1cclxuIiwiaW1wb3J0IHsgVGltZXIgfSBmcm9tIFwiLi90aW1lci5qc1wiO1xyXG5pbXBvcnQgeyBSZW5kZXIgfSBmcm9tIFwiLi9ybmQvcmVuZGVyLmpzXCI7XHJcbmltcG9ydCB7IGNhbWVyYSB9IGZyb20gXCIuLi9tdGgvY2FtZXJhLmpzXCI7XHJcbmltcG9ydCB7IGNhbnZhcyB9IGZyb20gXCIuLi9nbC5qc1wiO1xyXG5pbXBvcnQgeyBjb250cm9sIH0gZnJvbSBcIi4vaW5wdXQuanNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBBbmltIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMudGltZXIgPSBuZXcgVGltZXIoKTtcclxuICAgIHRoaXMucmVuZGVyID0gbmV3IFJlbmRlcigpO1xyXG4gICAgdGhpcy5jYW1lcmEgPSBjYW1lcmEoKTtcclxuICAgIHRoaXMuY29udHJvbCA9IGNvbnRyb2woKTtcclxuICB9XHJcbiAgcmVzcG9uc2UoKSB7XHJcbiAgICB0aGlzLnRpbWVyLnJlc3BvbnNlKCk7XHJcbiAgICB0aGlzLmNvbnRyb2wucmVzcG9uc2UoKTtcclxuICB9XHJcbiAgZHJhdygpIHtcclxuICAgIHRoaXMuY2FtZXJhLnNldFNpemUoY2FudmFzLmNsaWVudFdpZHRoLCBjYW52YXMuY2xpZW50SGVpZ2h0KTtcclxuICAgIHRoaXMucmVuZGVyLnJlbmRlcigpO1xyXG4gIH1cclxufVxyXG4iLCIvLyBNYWluIG1vZHVsZVxyXG5pbXBvcnQgeyBBbmltIH0gZnJvbSBcIi4vYW5pbS9hbmltYXRpb24uanNcIjtcclxuLy8gaW1wb3J0IHsgUmVuZGVyIH0gZnJvbSBcIi4vYW5pbS9ybmQvcmVuZGVyLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFpbigpIHtcclxuICB3aW5kb3cuYW5pbSA9IG5ldyBBbmltKCk7XHJcbiAgUHJvbWlzZS5hbGwoW1xyXG4gICAgd2luZG93LmFuaW0ucmVuZGVyLnNoYWRlckRlZmF1bHQudmVydFRleHQsXHJcbiAgICB3aW5kb3cuYW5pbS5yZW5kZXIuc2hhZGVyRGVmYXVsdC5mcmFnVGV4dCxcclxuICAgIHdpbmRvdy5hbmltLnJlbmRlci5zaGFkZXJTY29wZS52ZXJ0VGV4dCxcclxuICAgIHdpbmRvdy5hbmltLnJlbmRlci5zaGFkZXJTY29wZS5mcmFnVGV4dCxcclxuICBdKS50aGVuKChyZXMpID0+IHtcclxuICAgIGNvbnN0IHZzZCA9IHJlc1swXTtcclxuICAgIGNvbnN0IGZzZCA9IHJlc1sxXTtcclxuICAgIGNvbnN0IHZzcyA9IHJlc1syXTtcclxuICAgIGNvbnN0IGZzcyA9IHJlc1szXTtcclxuXHJcbiAgICB3aW5kb3cuYW5pbS5yZW5kZXIuc2hhZGVyRGVmYXVsdC5hZGQodnNkLCBmc2QpO1xyXG4gICAgd2luZG93LmFuaW0ucmVuZGVyLnNoYWRlclNjb3BlLmFkZCh2c3MsIGZzcyk7XHJcbiAgICB3aW5kb3cuYW5pbS5yZW5kZXIucmVzSW5pdCgpO1xyXG5cclxuICAgIGNvbnN0IGRyYXcgPSAoKSA9PiB7XHJcbiAgICAgIHdpbmRvdy5hbmltLnJlc3BvbnNlKCk7XHJcbiAgICAgIHdpbmRvdy5hbmltLmRyYXcoKTtcclxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShkcmF3KTtcclxuICAgIH07XHJcbiAgICBkcmF3KCk7XHJcbiAgfSk7XHJcbn1cclxuIiwiaW1wb3J0IHsgaW8gfSBmcm9tIFwic29ja2V0LmlvLWNsaWVudFwiO1xyXG5pbXBvcnQgeyBtYWluIH0gZnJvbSBcIi4vc3JjL21haW4uanNcIjtcclxuaW1wb3J0IHsgY2FudmFzIH0gZnJvbSBcIi4vc3JjL2dsLmpzXCI7XHJcblxyXG53aW5kb3cuc29ja2V0ID0gaW8oKTtcclxud2luZG93LmFjdGl2ZUJ1dHRvbnMgPSBbXTtcclxuXHJcbi8vIE1vdXNlIGRhdGFcclxud2luZG93Lm1vdXNlWCA9IDA7XHJcbndpbmRvdy5tb3VzZVhPbGQgPSAwO1xyXG53aW5kb3cubW91c2VEeCA9IDA7XHJcbndpbmRvdy5tb3VzZVkgPSAwO1xyXG53aW5kb3cubW91c2VZT2xkID0gMDtcclxud2luZG93Lm1vdXNlRHkgPSAwO1xyXG53aW5kb3cuaXNDbGlja2VkID0gZmFsc2U7XHJcblxyXG5mdW5jdGlvbiBhZGRJbmZvQmxvY2soKSB7XHJcbiAgbGV0IGJsb2NrID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3cmFwXCIpO1xyXG4gIGJsb2NrLmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG4gIGlmICh3aW5kb3cub3RoZXJQbGF5ZXJzICE9PSBudWxsKSB7XHJcbiAgYmxvY2suaW5zZXJ0QWRqYWNlbnRIVE1MKFwiYmVmb3JlZW5kXCIsIGA8ZGl2IGNsYXNzPVwicGVyc29uXCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiBibGFjaztcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicGVycy1jb2xvclwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogJHt3aW5kb3cucGxheWVyLmNvbG9yfTtcIj48L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicGVycy1uYW1lXCI+JHt3aW5kb3cucGxheWVyLm5hbWV9PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInBlcnMtc3RhdFwiPiR7d2luZG93LnBsYXllci5oZWFsdGh9LzEwMDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmApO1xyXG4gIH1cclxuICBcclxuICBpZiAod2luZG93Lm90aGVyUGxheWVycyAhPT0gbnVsbCkge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3aW5kb3cub3RoZXJQbGF5ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGJsb2NrLmluc2VydEFkamFjZW50SFRNTChcImJlZm9yZWVuZFwiLCBgPGRpdiBjbGFzcz1cInBlcnNvblwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInBlcnMtY29sb3JcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICR7d2luZG93Lm90aGVyUGxheWVyc1tpXS5jb2xvcn07XCI+PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicGVycy1uYW1lXCI+JHt3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLm5hbWV9PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicGVycy1zdGF0XCI+JHt3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLmhlYWx0aH0vMTAwPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmApO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbWFpbkNsaWVudCgpIHtcclxuICAvLyBjbGllbnQtc2lkZVxyXG4gIHdpbmRvdy5zb2NrZXQub24oXCJjb25uZWN0XCIsICgpID0+IHtcclxuICAgIGNvbnNvbGUubG9nKHdpbmRvdy5zb2NrZXQuaWQpOyAvLyB4OFdJdjctbUplbGc3b25fQUxieFxyXG4gIH0pO1xyXG5cclxuICB3aW5kb3cuc29ja2V0Lm9uKFwiTUZTOk90aGVyX1BsYXllcnNcIiwgZnVuY3Rpb24obXNnKSB7XHJcbiAgICBsZXQgdG1wUGxheWVycyA9IG1zZy5zcGxpdCgnfCcpO1xyXG4gICAgd2luZG93Lm90aGVyUGxheWVycyA9IFtdO1xyXG4gICAgXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRtcFBsYXllcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgaWYgKHRtcFBsYXllcnNbaV0gIT09IFwiXCIpIHtcclxuICAgICAgICB3aW5kb3cub3RoZXJQbGF5ZXJzLnB1c2goSlNPTi5wYXJzZSh0bXBQbGF5ZXJzW2ldKSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGFkZEluZm9CbG9jaygpO1xyXG4gIH0pO1xyXG5cclxuICB3aW5kb3cuc29ja2V0Lm9uKFwiTUZTOkdldF9QbGF5ZXJcIiwgZnVuY3Rpb24obXNnKSB7XHJcbiAgICB3aW5kb3cucGxheWVyID0gSlNPTi5wYXJzZShtc2cpO1xyXG4gICAgYWRkSW5mb0Jsb2NrKCk7XHJcbiAgfSk7XHJcblxyXG4gIHdpbmRvdy5zb2NrZXQub24oXCJNRlM6SW52YWxpZF9OYW1lXCIsIChtc2cpID0+IHtcclxuICAgIGxldCB0aXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vbVNob3dcIik7XHJcbiAgICBsZXQgbWVzID0gbXNnLnNwbGl0KFwifFwiKTtcclxuXHJcbiAgICB0aXRsZS5pbm5lclRleHQgPSBgdGhpcyBuYW1lIGhhZCBhbHJlYWR5IHRha2VuYDtcclxuICAgIHRpdGxlLnN0eWxlLmNvbG9yID0gXCJyZWRcIjtcclxuICAgIHRpdGxlLnN0eWxlLmZvbnRTdHlsZSA9IFwiaXRhbGljXCI7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXJ0XCIpLnZhbHVlID0gXCJHTyFcIjtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyTmFtZVwiKS52YWx1ZSA9IG1lc1swXTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vbVwiKS52YWx1ZSA9IG1lc1sxXTtcclxuICB9KTtcclxuXHJcbiAgd2luZG93LnNvY2tldC5vbihcImRpc2Nvbm5lY3RcIiwgKCkgPT4ge1xyXG4gICAgY29uc29sZS5sb2cod2luZG93LnNvY2tldC5pZCk7IC8vIHVuZGVmaW5lZFxyXG4gIH0pO1xyXG5cclxuICB3aW5kb3cuc29ja2V0Lm9uKFwiTUZTOkdhbWVfT3ZlclwiLCAoKSA9PiB7XHJcbiAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgfSk7XHJcblxyXG4gIC8vQ1JFQVRFIFBMQVlFUlxyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhcnRcIikub25jbGljayA9ICgpID0+IHtcclxuICAgIGlmICh3aW5kb3cucGxheWVyID09PSBudWxsKSB7XHJcbiAgICAgIGxldCBwbGF5ZXJOYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lXCIpLnZhbHVlO1xyXG4gICAgICBsZXQgcGxheWVyUm9vbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vbVwiKS52YWx1ZTtcclxuICAgICAgbGV0IHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb29tU2hvd1wiKTtcclxuXHJcbiAgICAgIGlmIChwbGF5ZXJOYW1lICE9PSBcIlwiICYmIHBsYXllclJvb20gIT09IFwiXCIgJiYgIXBsYXllck5hbWUuaW5jbHVkZXMoXCIgXCIpICYmICFwbGF5ZXJSb29tLmluY2x1ZGVzKFwiIFwiKSkge1xyXG4gICAgICAgIHdpbmRvdy5zb2NrZXQuZW1pdChcIk1UUzpQbGF5ZXJfU2V0dGluZ3NcIiwgW3BsYXllck5hbWUsIHBsYXllclJvb21dLmpvaW4oJ3wnKSk7XHJcbiAgICAgICAgdGl0bGUuaW5uZXJUZXh0ID0gYFlvdXIgcm9vbSBpcyAnJHtwbGF5ZXJSb29tfSdgO1xyXG4gICAgICAgIHRpdGxlLnN0eWxlLmNvbG9yID0gXCJhbGljZWJsdWVcIjtcclxuICAgICAgICB0aXRsZS5zdHlsZS5mb250U3R5bGUgPSBcIm5vcm1hbFwiO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhcnRcIikudmFsdWUgPSBcIkxFQVZFXCI7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lXCIpLnZhbHVlID0gXCJcIjtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJvb21cIikudmFsdWUgPSBcIlwiO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRpdGxlLmlubmVyVGV4dCA9IGBpbnZhbGlkIHJvb20gb3IgcGxheWVyIG5hbWVgO1xyXG4gICAgICAgIHRpdGxlLnN0eWxlLmNvbG9yID0gXCJyZWRcIjtcclxuICAgICAgICB0aXRsZS5zdHlsZS5mb250U3R5bGUgPSBcIml0YWxpY1wiO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBcclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXZlbnQpID0+IHtcclxuICAgIGlmICghd2luZG93LmFjdGl2ZUJ1dHRvbnMuaW5jbHVkZXMoZXZlbnQuY29kZSkpXHJcbiAgICAgIHdpbmRvdy5hY3RpdmVCdXR0b25zLnB1c2goZXZlbnQuY29kZSk7XHJcbiAgfSk7XHJcblxyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3Vyc29yXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICBhd2FpdCBjYW52YXMucmVxdWVzdFBvaW50ZXJMb2NrKHsgdW5hZGp1c3RlZE1vdmVtZW50OiB0cnVlIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgKGV2ZW50KSA9PiB7XHJcbiAgICBpZiAod2luZG93LmFjdGl2ZUJ1dHRvbnMuaW5jbHVkZXMoZXZlbnQuY29kZSkpXHJcbiAgICAgIHdpbmRvdy5hY3RpdmVCdXR0b25zLnNwbGljZSh3aW5kb3cuYWN0aXZlQnV0dG9ucy5pbmRleE9mKGV2ZW50LmNvZGUpLCAxKTtcclxuICB9KTtcclxuXHJcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCAoZXZlbnQpID0+IHtcclxuICAgIHdpbmRvdy5tb3VzZUR4ID0gZXZlbnQubW92ZW1lbnRYO1xyXG4gICAgd2luZG93Lm1vdXNlRHkgPSBldmVudC5tb3ZlbWVudFk7XHJcbiAgfSk7XHJcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCAoKSA9PiB7XHJcbiAgICB3aW5kb3cuaXNDbGlja2VkID0gdHJ1ZTtcclxuICB9KTtcclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCAoKSA9PiB7XHJcbiAgICB3aW5kb3cuaXNDbGlja2VkID0gZmFsc2U7XHJcbiAgfSk7XHJcbn1cclxuXHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoZXZlbnQpID0+IHtcclxuICB3aW5kb3cucGxheWVyID0gbnVsbDtcclxuICB3aW5kb3cub3RoZXJQbGF5ZXJzID0gbnVsbDtcclxuXHJcbiAgbWFpbkNsaWVudCgpO1xyXG4gIG1haW4oKTtcclxufSk7Il0sIm5hbWVzIjpbIndpdGhOYXRpdmVCbG9iIiwid2l0aE5hdGl2ZUFycmF5QnVmZmVyIiwiaXNWaWV3IiwibG9va3VwIiwiZGVjb2RlIiwicHJvdG9jb2wiLCJnbG9iYWxUaGlzIiwiZW5jb2RlIiwiWE1MSHR0cFJlcXVlc3QiLCJTb2NrZXQiLCJSRVNFUlZFRF9FVkVOVFMiLCJFbmdpbmUiLCJ2ZWMzIiwic2hkLnNoYWRlcnMiLCJzaGQuc2hhZGVyIiwibXRsLm1hdGVyaWFscyIsIm10bC5tYXRlcmlhbCIsInRleC50ZXh0dXJlIiwibXRsLmxvYWRNdGxMaWIiLCJtdGwuZmluZE10bEJ5TmFtZSIsImNvbC5jaGVja0NvbGxpc2lvblNwaGVyZUFuZFNwaGVyZSIsImNvbC5jaGVja0NvbGxpc2lvblNwaGVyZUFuZEJveCIsImlvIl0sIm1hcHBpbmdzIjoiOzs7SUFBQSxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pDLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDM0IsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUM1QixZQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQzNCLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDM0IsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUM5QixZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQzlCLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDM0IsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSTtJQUN6QyxJQUFJLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sWUFBWSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFOztJQ1g1RCxNQUFNQSxnQkFBYyxHQUFHLE9BQU8sSUFBSSxLQUFLLFVBQVU7SUFDakQsS0FBSyxPQUFPLElBQUksS0FBSyxXQUFXO0lBQ2hDLFFBQVEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLDBCQUEwQixDQUFDLENBQUM7SUFDN0UsTUFBTUMsdUJBQXFCLEdBQUcsT0FBTyxXQUFXLEtBQUssVUFBVSxDQUFDO0lBQ2hFO0lBQ0EsTUFBTUMsUUFBTSxHQUFHLEdBQUcsSUFBSTtJQUN0QixJQUFJLE9BQU8sT0FBTyxXQUFXLENBQUMsTUFBTSxLQUFLLFVBQVU7SUFDbkQsVUFBVSxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNqQyxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxZQUFZLFdBQVcsQ0FBQztJQUNuRCxDQUFDLENBQUM7SUFDRixNQUFNLFlBQVksR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLGNBQWMsRUFBRSxRQUFRLEtBQUs7SUFDbkUsSUFBSSxJQUFJRixnQkFBYyxJQUFJLElBQUksWUFBWSxJQUFJLEVBQUU7SUFDaEQsUUFBUSxJQUFJLGNBQWMsRUFBRTtJQUM1QixZQUFZLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xDLFNBQVM7SUFDVCxhQUFhO0lBQ2IsWUFBWSxPQUFPLGtCQUFrQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN0RCxTQUFTO0lBQ1QsS0FBSztJQUNMLFNBQVMsSUFBSUMsdUJBQXFCO0lBQ2xDLFNBQVMsSUFBSSxZQUFZLFdBQVcsSUFBSUMsUUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDdkQsUUFBUSxJQUFJLGNBQWMsRUFBRTtJQUM1QixZQUFZLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xDLFNBQVM7SUFDVCxhQUFhO0lBQ2IsWUFBWSxPQUFPLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNsRSxTQUFTO0lBQ1QsS0FBSztJQUNMO0lBQ0EsSUFBSSxPQUFPLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFDO0lBQ0YsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLEtBQUs7SUFDL0MsSUFBSSxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0lBQ3hDLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxZQUFZO0lBQ3BDLFFBQVEsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEQsUUFBUSxRQUFRLENBQUMsR0FBRyxJQUFJLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLENBQUM7O0lDdkNEO0lBQ0EsTUFBTSxLQUFLLEdBQUcsa0VBQWtFLENBQUM7SUFDakY7SUFDQSxNQUFNQyxRQUFNLEdBQUcsT0FBTyxVQUFVLEtBQUssV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUN2QyxJQUFJQSxRQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBaUJNLE1BQU1DLFFBQU0sR0FBRyxDQUFDLE1BQU0sS0FBSztJQUNsQyxJQUFJLElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUNuSCxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0lBQzNDLFFBQVEsWUFBWSxFQUFFLENBQUM7SUFDdkIsUUFBUSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtJQUMvQyxZQUFZLFlBQVksRUFBRSxDQUFDO0lBQzNCLFNBQVM7SUFDVCxLQUFLO0lBQ0wsSUFBSSxNQUFNLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0YsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0lBQ2pDLFFBQVEsUUFBUSxHQUFHRCxRQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFFBQVEsUUFBUSxHQUFHQSxRQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRCxRQUFRLFFBQVEsR0FBR0EsUUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEQsUUFBUSxRQUFRLEdBQUdBLFFBQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BELFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksQ0FBQyxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2RCxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBRSxLQUFLLENBQUMsS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDOUQsUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUss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Q1QsS0FBSztBQUNMO0lBQ0EsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7SUFDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDakQsUUFBUSxPQUFPLElBQUksQ0FBQztJQUNwQixLQUFLO0FBQ0w7SUFDQTtJQUNBLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRTtJQUNiLFFBQVEsT0FBT0MsTUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEUsS0FBSztJQUNMO0lBQ0EsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFO0lBQ2IsUUFBUSxPQUFPQSxNQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRSxLQUFLO0lBQ0w7SUFDQSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUU7SUFDWCxRQUFRLElBQUksT0FBTyxDQUFDLElBQUksUUFBUTtJQUNoQyxZQUFZLE9BQU9BLE1BQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVELFFBQVEsT0FBT0EsTUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxD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Q0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNCLFNBQVMsQ0FBQztJQUNWLEtBQUs7SUFDTDtJQUNBLElBQUksU0FBUyxDQUFDLEdBQUcsRUFBRTtJQUNuQixRQUFRLE9BQU9BLE1BQUk7SUFDbkIsWUFBWSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUUsWUFBWSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUUsWUFBWSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUUsU0FBUyxDQUFDO0lBQ1YsS0FBSztJQUNMO0lBQ0EsSUFBSSxPQUFPLENBQUMs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Q2pCLEtBQUssTUFBTTtJQUNYLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLEtBQUs7SUFDTCxHQUFHO0FBQ0g7SUFDQSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUU7SUFDVCxJQUFJLElBQUksSUFBSSxDQUFDO0FBQ2I7SUFDQSxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUNoQyxTQUFTLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCO0lBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHO0lBQ2IsTUFBTTtJQUNOLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLE9BQU87SUFDUCxNQUFNO0lBQ04sUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsT0FBTztJQUNQLE1BQU07SUFDTixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxPQUFPO0lBQ1AsTUFBTTtJQUNOLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENB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LEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztJQUNyQixNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztJQUNyQixNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztJQUNyQixNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRztJQUNyQixNQUFNO0lBQ04sR0FBRztBQUNIO0lBQ0E7SUFDQSxFQUFFLE1BQU0sR0FBRztJQUNYLElBQUksSUFBSSxHQUFHO0lBQ1gsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixRQUFRLElBQUksQ0FBQyxTQUFTO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFNBQVM7SUFDVCxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLFFBQVEsSUFBSSxDQUFDLFNBQVM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsU0FBUztJQUNULE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsUUFBUSxJQUFJLENBQUMsU0FBUztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixTQUFTO0lBQ1QsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixRQUFRLElBQUksQ0FBQyxTQUFTO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFNBQVMsQ0FBQztBQUNWO0lBQ0EsSUFBSSxPQUFPLEdBQUcsQ0FBQztJQUNmLEdBQUc7QUFDSDtJQUNBLEVBQUUsT0FBTyxHQUFHO0lBQ1osSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdCLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQzVCO0lBQ0EsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7SUFDbEIsTUFBTSxJQUFJLENBQUMsR0FBRztJQUNkLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwQixRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsT0FBTyxDQUFDO0FBQ1I7SUFDQSxNQUFNLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLEtBQUs7QUFDTDtJQUNBO0lBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxJQUFJLENBQUMsU0FBUztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLEdBQUcsR0FBRyxDQUFDO0lBQ2QsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTO0lBQ3JCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLElBQUksQ0FBQyxTQUFTO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVM7SUFDckIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztBQUNkO0lBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTO0lBQ3JCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLElBQUksQ0FBQyxTQUFTO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVM7SUFDckIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sSUFBSSxDQUFDLFNBQVM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztBQUNkO0lBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxJQUFJLENBQUMsU0FBUztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLEdBQUcsR0FBRyxDQUFDO0lBQ2QsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTO0lBQ3JCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLElBQUksQ0FBQyxTQUFTO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVM7SUFDckIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztBQUNkO0lBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTO0lBQ3JCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7QUFDZDtJQUNBLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sSUFBSSxDQUFDLFNBQVM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUztJQUNyQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLEdBQUcsR0FBRyxDQUFDO0lBQ2QsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxJQUFJLENBQUMsU0FBUztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENB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LENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVELFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNDO0lBQ0EsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUM1QixNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUNqRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ2pELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25ELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25ELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbkQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUNqRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNuRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25ELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25ELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDakQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLElBQUksT0FBTyxJQUFJLENBQUM7SUFDaEIsR0FBRztBQUNIO0lBQ0EsRUFBRSxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRTtJQUMzQixJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEQsR0FBRztBQUNIO0lBQ0EsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUU7SUFDeEIsSUFBSSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRTtJQUNyQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRTtJQUN4QyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3hDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRztJQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxJQUFJLENBQUM7SUFDaEIsR0FBRztBQUNIO0lBQ0EsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUU7SUFDaEQsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHO0lBQ2IsTUFBTSxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsQyxNQUFNO0lBQ04sUUFBUSxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ3hDLFFBQVEsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUN4QyxRQUFRLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDcEMsUUFBUSxDQUFDO0lBQ1QsT0FBTztJQUNQLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxJQUFJ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Q0FBQyxDQUFDO0lBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1QixLQUFLLENBQUM7SUFDTixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRztJQUNmLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNCLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNCLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNCLEtBQUssQ0FBQztJQUNOLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHO0lBQ2xCLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNCLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNCLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNCLEtBQUssQ0FBQztJQUNOLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekQsR0FBRztBQUNIO0lBQ0E7SUFDQSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRTtJQUMzQyxJQUFJLElBQUksRUFBRSxHQUFHLFFBQVE7SUFDckIsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDO0FB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QyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3JILEVBQUUsQ0FBQyxPQUFPLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3RILEVBQUUsQ0FBQyxRQUFRLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQzFGLEVBQUUsQ0FBQyxRQUFRLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDO0lBQ3BILEVBQUUsQ0FBQyxRQUFRLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25ILEVBQUUsQ0FBQyxRQUFRLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25GLEVBQUUsQ0FBQyxTQUFTLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sT0FBTyxDQUFDO0lBQ3RILEVBQUUsQ0FBQyxRQUFRLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25ILEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbkgsRUFBRSxDQUFDLE1BQU0sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUM7SUFDakYsRUFBRSxDQUFDLEtBQUssV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUM7SUFDaEYsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUM7SUFDcEgsRUFBRSxDQUFDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQztJQUNwSCxFQUFFLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDO0lBQ3JILEVBQUUsQ0FBQyxNQUFNLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDO0lBQ3BILEVBQUUsQ0FBQyxVQUFVLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDO0lBQ3BILEVBQUUsQ0FBQyxPQUFPLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBQ3RILEVBQUUsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDO0lBQ2pGLEVBQUUsQ0FBQyxjQUFjLEdB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QUUsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoRixZQUFZLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkIsT0FBTztJQUNQLEtBQUssQ0FBQztJQUNOLEdBQUc7SUFDSCxFQUFFLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7QUFDRDtJQUNPLFNBQVMsT0FBTyxDQUFDLFdBQVcsRUFBRTtJQUNyQyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNiO0lBQ0EsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUMvQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixHQUFHO0lBQ0gsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7QUFDRDtJQUNPLFNBQVMsV0FBVyxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUU7SUFDckQsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0lBQ2pELElBQUksSUFBSSxFQUFFLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN6QyxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFDLElBQUksTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMs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QzNELE1BQU0sSUFBSSxFQUFFLEdBQUdBLFNBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzVDLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQyxLQUFLO0lBQ0wsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7SUFDM0QsTUFBTSxJQUFJLEVBQUUsR0FBR0EsU0FBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDNUMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFDLEtBQUs7SUFDTCxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtJQUMzRCxNQUFNLElBQUksRUFBRSxHQUFHQSxTQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUM1QyxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUMsS0FBSztJQUNMLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN6RCxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFQSxTQUFhLENBQUMsSUFBSSxDQUFDLEtB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LENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxLQUFLLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDaEQ7SUFDQSxNQUFNO0lBQ04sUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFDMUIsUUFBUSxDQUFDLEdBQUcsS0FBSztJQUNqQixRQUFRLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxLQUFLLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDL0MsUUFBUTtJQUNSLFFBQVEsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTTtJQUNqQyxVQUFVQSxNQUFJO0lBQ2QsWUFBWSxDQUFDLFdBQVcsR0FBRyxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUMxRSxZQUFZLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUMxQyxZQUFZLENBQUMsV0FBVyxHQUFHLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBQzFFLFdBQVc7SUFDWCxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDakIsVUFBVUEsTUFBSTtJQUNkLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUMzQyxZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQzNCLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUMzQyxXQUFXO0lBQ1gsVUFBVSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLFNBQVMsQ0FBQztJQUNWLE9BQU87QUFDUDtJQUNBO0lBQ0EsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFO0lBQzlELE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUU7SUFDakQsUUFBUSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDOUIsUUFBUSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLFFBQVEsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQztBQUN0QztJQUNBLFFBQVEsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDMUMsUUFBUSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLFFBQVEsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQztJQUN0QyxPQUFPO0FBQ1A7SUFDQTtJQUNBLElBQUksT0FBTyxJQUFJLElBQUk7SUFDbkIsTUFBTSxFQUFFLENBQUMsU0FBUztJQUNsQixNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDMUIsTUFBTSxVQUFVO0lBQ2hCLE1BQU0sSUFBSSxDQUFDLEtBQUs7SUFDaEIsTUFBTSxJQUFJLENBQUMsRUFBRTtJQUNiLEtBQUssQ0FBQztJQUNOLEdBQUc7QUFDSDtJQUNBLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDbEIsSUFBSSxNQUFNLFNBQVMsR0FBRztJQUN0QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixNQUFLO0lBQ0wsSUFBSSxNQUFNLE9BQU8sR0FBRztJQUNwQixNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUN6RSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUNoRSxNQUFLO0FBQ0w7SUFDQSxJQUFJLElBQUksY0FBYyxHQUFHLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyRSxJQUFJLFdBQVcsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDekM7SUFDQSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDaEM7SUFDQSxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVM7SUFDaEMsTUFBTSxPQUFPLENBQUMsY0FBYyxDQUFDO0lBQzdCLE1BQU0sT0FBTztJQUNiLE1BQU0sSUFBSSxDQUFDLEtBQUs7SUFDaEIsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDZixHQUFHO0lBQ0gsQ0FBQztBQUNEO0lBQ08sU0FBUyxJQUFJLENBQUMsR0FBRyxJQUFJLEVBQUU7SUFDOUIsRUFBRSxPQUFPLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDNUI7O0lDblJBO0lBQ0E7QUFRQTtJQUNPLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUN0QixJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDZixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDWCxJQUFJLE9BQU8sR0FBRztJQUNyQixFQUFFLENBQUNBLE1BQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hELEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFQSxNQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEQ7SUFDQSxFQUFFLENBQUNBLE1BQUksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFQSxNQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlDLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5QyxFQUFFLENBQUNBLE1BQUksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFQSxNQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pELEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdDLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVDLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVDLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5QyxFQUFFLENBQUNBLE1BQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFQSxNQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQy9DLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqRCxFQUFFLENBQUNBLE1BQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDO0FBQ0Y7SUFDTyxNQUFNLE1BQU0sQ0FBQztJQUNwQixFQUFFLFdBQVcsR0FBRztJQUNoQixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ2xDO0lBQ0EsSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHRSxNQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0MsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHQSxNQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0MsR0FBRztBQUNIO0lBQ0EsRUFBRSxPQUFPLEdBQUc7SUFDWixJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUdFLFFBQVksRUFBRSxDQUFDO0lBQ25DLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBR0EsUUFBWTtJQUNyQyxNQUFNLGdCQUFnQjtJQUN0QixNQUFNSixNQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkIsTUFBTUEsTUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25CLE1BQU1BLE1BQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuQixNQUFNLElBQUk7SUFDVixNQUFNLENBQUM7SUFDUCxNQUFNLElBQUk7SUFDVixNQUFNQyxPQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLEtBQUssQ0FBQztJQUNOLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBR0ksT0FBVyxFQUFFLENBQUM7SUFDakMsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO0lBQzlELElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25CLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJO0lBQ3pCLE1BQU0sRUFBRSxDQUFDLGNBQWM7SUFDdkIsTUFBTSxJQUFJLFlBQVksQ0FBQztJQUN2QixRQUFRLENBQUMsQ0FBQztJQUNWLFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQyxDQUFDO0lBQ1YsUUFBUSxDQUFDLENBQUM7SUFDVixRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUM7SUFDVCxRQUFRLENBQUMsQ0FBQztJQUNWLFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULFFBQVEsQ0FBQztJQUNULE9BQU8sQ0FBQztJQUNSLE1BQU0sSUFBSTtJQUNWLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLO0lBQzlCLEtBQUssQ0FBQztJQUNOLElBQUksSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7QUFDOUI7SUFDQSxJQUFJQyxVQUFjLEVBQUUsQ0FBQztJQUNyQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQzdDLE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0MsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzQixNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFQyxhQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0gsS0FBSztJQUNMLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFQSxhQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUNQLE1BQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFQSxNQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdEk7SUFDQSxJQUFJLElBQUksTUFBTSxDQUFDLFlBQVksS0FBSyxJQUFJLEVBQUU7SUFDdEMsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxN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QyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlLLE9BQU87SUFDUCxLQUFLO0lBQ0wsR0FBRztBQUNIO0lBQ0EsRUFBRSxZQUFZLEdBQUc7SUFDakIsSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksSUFBSSxFQUFFO0lBQy9CLE1BQU0sSUFBSSxHQUFHLEdBQUdQLE1BQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLE1BQU0sSUFBSSxHQUFHLEdBQUdBLE1BQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDM0MsTUFBTSxJQUFJLElBQUksR0FBR0EsTUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0IsTUFBTSxJQUFJLE1BQU0sR0FBR0EsTUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hELE1BQU0sSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRztJQUM1QixRQUFRLE1BQU0sQ0FBQyxHQUFHO0lBQ2xC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
