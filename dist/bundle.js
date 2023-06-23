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

      [vec3$1(-60, mazeFloor, -60), vec3$1(-60, mazeH, 60)],
      [vec3$1(-60, mazeFloor, -60), vec3$1(60, mazeH, -60)],
      [vec3$1(60, mazeFloor, -60), vec3$1(60, mazeH, 60)],
      [vec3$1(-60, mazeFloor, 60), vec3$1(60, mazeH, 60)],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLXBhcnNlci9idWlsZC9lc20vY29tbW9ucy5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL2J1aWxkL2VzbS9lbmNvZGVQYWNrZXQuYnJvd3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL2J1aWxkL2VzbS9jb250cmliL2Jhc2U2NC1hcnJheWJ1ZmZlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL2J1aWxkL2VzbS9kZWNvZGVQYWNrZXQuYnJvd3Nlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL2J1aWxkL2VzbS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9Ac29ja2V0LmlvL2NvbXBvbmVudC1lbWl0dGVyL2luZGV4Lm1qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS9nbG9iYWxUaGlzLmJyb3dzZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vdXRpbC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS90cmFuc3BvcnQuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vY29udHJpYi95ZWFzdC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS9jb250cmliL3BhcnNlcXMuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vY29udHJpYi9oYXMtY29ycy5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS90cmFuc3BvcnRzL3htbGh0dHByZXF1ZXN0LmJyb3dzZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vdHJhbnNwb3J0cy9wb2xsaW5nLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvYnVpbGQvZXNtL3RyYW5zcG9ydHMvd2Vic29ja2V0LWNvbnN0cnVjdG9yLmJyb3dzZXIuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vdHJhbnNwb3J0cy93ZWJzb2NrZXQuanMiLCIuLi9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9idWlsZC9lc20vdHJhbnNwb3J0cy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2J1aWxkL2VzbS9jb250cmliL3BhcnNldXJpLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvYnVpbGQvZXNtL3NvY2tldC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2J1aWxkL2VzbS91cmwuanMiLCIuLi9ub2RlX21vZHVsZXMvc29ja2V0LmlvLXBhcnNlci9idWlsZC9lc20vaXMtYmluYXJ5LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3NvY2tldC5pby1wYXJzZXIvYnVpbGQvZXNtL2JpbmFyeS5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tcGFyc2VyL2J1aWxkL2VzbS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2J1aWxkL2VzbS9vbi5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2J1aWxkL2VzbS9zb2NrZXQuanMiLCIuLi9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9idWlsZC9lc20vY29udHJpYi9iYWNrbzIuanMiLCIuLi9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9idWlsZC9lc20vbWFuYWdlci5qcyIsIi4uL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2J1aWxkL2VzbS9pbmRleC5qcyIsIi4uL2NsaWVudC9zcmMvYW5pbS90aW1lci5qcyIsIi4uL2NsaWVudC9zcmMvbXRoL3ZlYzMuanMiLCIuLi9jbGllbnQvc3JjL210aC92ZWMyLmpzIiwiLi4vY2xpZW50L3NyYy9tdGgvdmVjNC5qcyIsIi4uL2NsaWVudC9zcmMvbXRoL21hdDQuanMiLCIuLi9jbGllbnQvc3JjL210aC9jYW1lcmEuanMiLCIuLi9jbGllbnQvc3JjL2dsLmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL3JuZC9yZXMvc2hhZGVyLmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL3JuZC9yZXMvbWF0ZXJpYWwuanMiLCIuLi9jbGllbnQvc3JjL2FuaW0vcm5kL3Jlcy90ZXh0dXJlLmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL3JuZC92ZXJ0ZXguanMiLCIuLi9jbGllbnQvc3JjL2FuaW0vcm5kL3ByaW1pdGl2ZS5qcyIsIi4uL2NsaWVudC9zcmMvYW5pbS9ybmQvcmVuZGVyLmpzIiwiLi4vY2xpZW50L3NyYy9tdGgvY29sbGlzaW9uLmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL2lucHV0LmpzIiwiLi4vY2xpZW50L3NyYy9hbmltL2FuaW1hdGlvbi5qcyIsIi4uL2NsaWVudC9zcmMvbWFpbi5qcyIsIi4uL2NsaWVudC9jbGllbnQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgUEFDS0VUX1RZUEVTID0gT2JqZWN0LmNyZWF0ZShudWxsKTsgLy8gbm8gTWFwID0gbm8gcG9seWZpbGxcblBBQ0tFVF9UWVBFU1tcIm9wZW5cIl0gPSBcIjBcIjtcblBBQ0tFVF9UWVBFU1tcImNsb3NlXCJdID0gXCIxXCI7XG5QQUNLRVRfVFlQRVNbXCJwaW5nXCJdID0gXCIyXCI7XG5QQUNLRVRfVFlQRVNbXCJwb25nXCJdID0gXCIzXCI7XG5QQUNLRVRfVFlQRVNbXCJtZXNzYWdlXCJdID0gXCI0XCI7XG5QQUNLRVRfVFlQRVNbXCJ1cGdyYWRlXCJdID0gXCI1XCI7XG5QQUNLRVRfVFlQRVNbXCJub29wXCJdID0gXCI2XCI7XG5jb25zdCBQQUNLRVRfVFlQRVNfUkVWRVJTRSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5PYmplY3Qua2V5cyhQQUNLRVRfVFlQRVMpLmZvckVhY2goa2V5ID0+IHtcbiAgICBQQUNLRVRfVFlQRVNfUkVWRVJTRVtQQUNLRVRfVFlQRVNba2V5XV0gPSBrZXk7XG59KTtcbmNvbnN0IEVSUk9SX1BBQ0tFVCA9IHsgdHlwZTogXCJlcnJvclwiLCBkYXRhOiBcInBhcnNlciBlcnJvclwiIH07XG5leHBvcnQgeyBQQUNLRVRfVFlQRVMsIFBBQ0tFVF9UWVBFU19SRVZFUlNFLCBFUlJPUl9QQUNLRVQgfTtcbiIsImltcG9ydCB7IFBBQ0tFVF9UWVBFUyB9IGZyb20gXCIuL2NvbW1vbnMuanNcIjtcbmNvbnN0IHdpdGhOYXRpdmVCbG9iID0gdHlwZW9mIEJsb2IgPT09IFwiZnVuY3Rpb25cIiB8fFxuICAgICh0eXBlb2YgQmxvYiAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoQmxvYikgPT09IFwiW29iamVjdCBCbG9iQ29uc3RydWN0b3JdXCIpO1xuY29uc3Qgd2l0aE5hdGl2ZUFycmF5QnVmZmVyID0gdHlwZW9mIEFycmF5QnVmZmVyID09PSBcImZ1bmN0aW9uXCI7XG4vLyBBcnJheUJ1ZmZlci5pc1ZpZXcgbWV0aG9kIGlzIG5vdCBkZWZpbmVkIGluIElFMTBcbmNvbnN0IGlzVmlldyA9IG9iaiA9PiB7XG4gICAgcmV0dXJuIHR5cGVvZiBBcnJheUJ1ZmZlci5pc1ZpZXcgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICA/IEFycmF5QnVmZmVyLmlzVmlldyhvYmopXG4gICAgICAgIDogb2JqICYmIG9iai5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbn07XG5jb25zdCBlbmNvZGVQYWNrZXQgPSAoeyB0eXBlLCBkYXRhIH0sIHN1cHBvcnRzQmluYXJ5LCBjYWxsYmFjaykgPT4ge1xuICAgIGlmICh3aXRoTmF0aXZlQmxvYiAmJiBkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICBpZiAoc3VwcG9ydHNCaW5hcnkpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVCbG9iQXNCYXNlNjQoZGF0YSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpdGhOYXRpdmVBcnJheUJ1ZmZlciAmJlxuICAgICAgICAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IGlzVmlldyhkYXRhKSkpIHtcbiAgICAgICAgaWYgKHN1cHBvcnRzQmluYXJ5KSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlQmxvYkFzQmFzZTY0KG5ldyBCbG9iKFtkYXRhXSksIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBwbGFpbiBzdHJpbmdcbiAgICByZXR1cm4gY2FsbGJhY2soUEFDS0VUX1RZUEVTW3R5cGVdICsgKGRhdGEgfHwgXCJcIikpO1xufTtcbmNvbnN0IGVuY29kZUJsb2JBc0Jhc2U2NCA9IChkYXRhLCBjYWxsYmFjaykgPT4ge1xuICAgIGNvbnN0IGZpbGVSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIGZpbGVSZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCBjb250ZW50ID0gZmlsZVJlYWRlci5yZXN1bHQuc3BsaXQoXCIsXCIpWzFdO1xuICAgICAgICBjYWxsYmFjayhcImJcIiArIChjb250ZW50IHx8IFwiXCIpKTtcbiAgICB9O1xuICAgIHJldHVybiBmaWxlUmVhZGVyLnJlYWRBc0RhdGFVUkwoZGF0YSk7XG59O1xuZXhwb3J0IGRlZmF1bHQgZW5jb2RlUGFja2V0O1xuIiwiLy8gaW1wb3J0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vc29ja2V0aW8vYmFzZTY0LWFycmF5YnVmZmVyXG5jb25zdCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcbi8vIFVzZSBhIGxvb2t1cCB0YWJsZSB0byBmaW5kIHRoZSBpbmRleC5cbmNvbnN0IGxvb2t1cCA9IHR5cGVvZiBVaW50OEFycmF5ID09PSAndW5kZWZpbmVkJyA/IFtdIDogbmV3IFVpbnQ4QXJyYXkoMjU2KTtcbmZvciAobGV0IGkgPSAwOyBpIDwgY2hhcnMubGVuZ3RoOyBpKyspIHtcbiAgICBsb29rdXBbY2hhcnMuY2hhckNvZGVBdChpKV0gPSBpO1xufVxuZXhwb3J0IGNvbnN0IGVuY29kZSA9IChhcnJheWJ1ZmZlcikgPT4ge1xuICAgIGxldCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKSwgaSwgbGVuID0gYnl0ZXMubGVuZ3RoLCBiYXNlNjQgPSAnJztcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDMpIHtcbiAgICAgICAgYmFzZTY0ICs9IGNoYXJzW2J5dGVzW2ldID4+IDJdO1xuICAgICAgICBiYXNlNjQgKz0gY2hhcnNbKChieXRlc1tpXSAmIDMpIDw8IDQpIHwgKGJ5dGVzW2kgKyAxXSA+PiA0KV07XG4gICAgICAgIGJhc2U2NCArPSBjaGFyc1soKGJ5dGVzW2kgKyAxXSAmIDE1KSA8PCAyKSB8IChieXRlc1tpICsgMl0gPj4gNildO1xuICAgICAgICBiYXNlNjQgKz0gY2hhcnNbYnl0ZXNbaSArIDJdICYgNjNdO1xuICAgIH1cbiAgICBpZiAobGVuICUgMyA9PT0gMikge1xuICAgICAgICBiYXNlNjQgPSBiYXNlNjQuc3Vic3RyaW5nKDAsIGJhc2U2NC5sZW5ndGggLSAxKSArICc9JztcbiAgICB9XG4gICAgZWxzZSBpZiAobGVuICUgMyA9PT0gMSkge1xuICAgICAgICBiYXNlNjQgPSBiYXNlNjQuc3Vic3RyaW5nKDAsIGJhc2U2NC5sZW5ndGggLSAyKSArICc9PSc7XG4gICAgfVxuICAgIHJldHVybiBiYXNlNjQ7XG59O1xuZXhwb3J0IGNvbnN0IGRlY29kZSA9IChiYXNlNjQpID0+IHtcbiAgICBsZXQgYnVmZmVyTGVuZ3RoID0gYmFzZTY0Lmxlbmd0aCAqIDAuNzUsIGxlbiA9IGJhc2U2NC5sZW5ndGgsIGksIHAgPSAwLCBlbmNvZGVkMSwgZW5jb2RlZDIsIGVuY29kZWQzLCBlbmNvZGVkNDtcbiAgICBpZiAoYmFzZTY0W2Jhc2U2NC5sZW5ndGggLSAxXSA9PT0gJz0nKSB7XG4gICAgICAgIGJ1ZmZlckxlbmd0aC0tO1xuICAgICAgICBpZiAoYmFzZTY0W2Jhc2U2NC5sZW5ndGggLSAyXSA9PT0gJz0nKSB7XG4gICAgICAgICAgICBidWZmZXJMZW5ndGgtLTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBhcnJheWJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihidWZmZXJMZW5ndGgpLCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICAgICAgZW5jb2RlZDEgPSBsb29rdXBbYmFzZTY0LmNoYXJDb2RlQXQoaSldO1xuICAgICAgICBlbmNvZGVkMiA9IGxvb2t1cFtiYXNlNjQuY2hhckNvZGVBdChpICsgMSldO1xuICAgICAgICBlbmNvZGVkMyA9IGxvb2t1cFtiYXNlNjQuY2hhckNvZGVBdChpICsgMildO1xuICAgICAgICBlbmNvZGVkNCA9IGxvb2t1cFtiYXNlNjQuY2hhckNvZGVBdChpICsgMyldO1xuICAgICAgICBieXRlc1twKytdID0gKGVuY29kZWQxIDw8IDIpIHwgKGVuY29kZWQyID4+IDQpO1xuICAgICAgICBieXRlc1twKytdID0gKChlbmNvZGVkMiAmIDE1KSA8PCA0KSB8IChlbmNvZGVkMyA+PiAyKTtcbiAgICAgICAgYnl0ZXNbcCsrXSA9ICgoZW5jb2RlZDMgJiAzKSA8PCA2KSB8IChlbmNvZGVkNCAmIDYzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5YnVmZmVyO1xufTtcbiIsImltcG9ydCB7IEVSUk9SX1BBQ0tFVCwgUEFDS0VUX1RZUEVTX1JFVkVSU0UgfSBmcm9tIFwiLi9jb21tb25zLmpzXCI7XG5pbXBvcnQgeyBkZWNvZGUgfSBmcm9tIFwiLi9jb250cmliL2Jhc2U2NC1hcnJheWJ1ZmZlci5qc1wiO1xuY29uc3Qgd2l0aE5hdGl2ZUFycmF5QnVmZmVyID0gdHlwZW9mIEFycmF5QnVmZmVyID09PSBcImZ1bmN0aW9uXCI7XG5jb25zdCBkZWNvZGVQYWNrZXQgPSAoZW5jb2RlZFBhY2tldCwgYmluYXJ5VHlwZSkgPT4ge1xuICAgIGlmICh0eXBlb2YgZW5jb2RlZFBhY2tldCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogXCJtZXNzYWdlXCIsXG4gICAgICAgICAgICBkYXRhOiBtYXBCaW5hcnkoZW5jb2RlZFBhY2tldCwgYmluYXJ5VHlwZSlcbiAgICAgICAgfTtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IGVuY29kZWRQYWNrZXQuY2hhckF0KDApO1xuICAgIGlmICh0eXBlID09PSBcImJcIikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogXCJtZXNzYWdlXCIsXG4gICAgICAgICAgICBkYXRhOiBkZWNvZGVCYXNlNjRQYWNrZXQoZW5jb2RlZFBhY2tldC5zdWJzdHJpbmcoMSksIGJpbmFyeVR5cGUpXG4gICAgICAgIH07XG4gICAgfVxuICAgIGNvbnN0IHBhY2tldFR5cGUgPSBQQUNLRVRfVFlQRVNfUkVWRVJTRVt0eXBlXTtcbiAgICBpZiAoIXBhY2tldFR5cGUpIHtcbiAgICAgICAgcmV0dXJuIEVSUk9SX1BBQ0tFVDtcbiAgICB9XG4gICAgcmV0dXJuIGVuY29kZWRQYWNrZXQubGVuZ3RoID4gMVxuICAgICAgICA/IHtcbiAgICAgICAgICAgIHR5cGU6IFBBQ0tFVF9UWVBFU19SRVZFUlNFW3R5cGVdLFxuICAgICAgICAgICAgZGF0YTogZW5jb2RlZFBhY2tldC5zdWJzdHJpbmcoMSlcbiAgICAgICAgfVxuICAgICAgICA6IHtcbiAgICAgICAgICAgIHR5cGU6IFBBQ0tFVF9UWVBFU19SRVZFUlNFW3R5cGVdXG4gICAgICAgIH07XG59O1xuY29uc3QgZGVjb2RlQmFzZTY0UGFja2V0ID0gKGRhdGEsIGJpbmFyeVR5cGUpID0+IHtcbiAgICBpZiAod2l0aE5hdGl2ZUFycmF5QnVmZmVyKSB7XG4gICAgICAgIGNvbnN0IGRlY29kZWQgPSBkZWNvZGUoZGF0YSk7XG4gICAgICAgIHJldHVybiBtYXBCaW5hcnkoZGVjb2RlZCwgYmluYXJ5VHlwZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4geyBiYXNlNjQ6IHRydWUsIGRhdGEgfTsgLy8gZmFsbGJhY2sgZm9yIG9sZCBicm93c2Vyc1xuICAgIH1cbn07XG5jb25zdCBtYXBCaW5hcnkgPSAoZGF0YSwgYmluYXJ5VHlwZSkgPT4ge1xuICAgIHN3aXRjaCAoYmluYXJ5VHlwZSkge1xuICAgICAgICBjYXNlIFwiYmxvYlwiOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciA/IG5ldyBCbG9iKFtkYXRhXSkgOiBkYXRhO1xuICAgICAgICBjYXNlIFwiYXJyYXlidWZmZXJcIjpcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkYXRhOyAvLyBhc3N1bWluZyB0aGUgZGF0YSBpcyBhbHJlYWR5IGFuIEFycmF5QnVmZmVyXG4gICAgfVxufTtcbmV4cG9ydCBkZWZhdWx0IGRlY29kZVBhY2tldDtcbiIsImltcG9ydCBlbmNvZGVQYWNrZXQgZnJvbSBcIi4vZW5jb2RlUGFja2V0LmpzXCI7XG5pbXBvcnQgZGVjb2RlUGFja2V0IGZyb20gXCIuL2RlY29kZVBhY2tldC5qc1wiO1xuY29uc3QgU0VQQVJBVE9SID0gU3RyaW5nLmZyb21DaGFyQ29kZSgzMCk7IC8vIHNlZSBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9EZWxpbWl0ZXIjQVNDSUlfZGVsaW1pdGVkX3RleHRcbmNvbnN0IGVuY29kZVBheWxvYWQgPSAocGFja2V0cywgY2FsbGJhY2spID0+IHtcbiAgICAvLyBzb21lIHBhY2tldHMgbWF5IGJlIGFkZGVkIHRvIHRoZSBhcnJheSB3aGlsZSBlbmNvZGluZywgc28gdGhlIGluaXRpYWwgbGVuZ3RoIG11c3QgYmUgc2F2ZWRcbiAgICBjb25zdCBsZW5ndGggPSBwYWNrZXRzLmxlbmd0aDtcbiAgICBjb25zdCBlbmNvZGVkUGFja2V0cyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgcGFja2V0cy5mb3JFYWNoKChwYWNrZXQsIGkpID0+IHtcbiAgICAgICAgLy8gZm9yY2UgYmFzZTY0IGVuY29kaW5nIGZvciBiaW5hcnkgcGFja2V0c1xuICAgICAgICBlbmNvZGVQYWNrZXQocGFja2V0LCBmYWxzZSwgZW5jb2RlZFBhY2tldCA9PiB7XG4gICAgICAgICAgICBlbmNvZGVkUGFja2V0c1tpXSA9IGVuY29kZWRQYWNrZXQ7XG4gICAgICAgICAgICBpZiAoKytjb3VudCA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZW5jb2RlZFBhY2tldHMuam9pbihTRVBBUkFUT1IpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuY29uc3QgZGVjb2RlUGF5bG9hZCA9IChlbmNvZGVkUGF5bG9hZCwgYmluYXJ5VHlwZSkgPT4ge1xuICAgIGNvbnN0IGVuY29kZWRQYWNrZXRzID0gZW5jb2RlZFBheWxvYWQuc3BsaXQoU0VQQVJBVE9SKTtcbiAgICBjb25zdCBwYWNrZXRzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbmNvZGVkUGFja2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBkZWNvZGVkUGFja2V0ID0gZGVjb2RlUGFja2V0KGVuY29kZWRQYWNrZXRzW2ldLCBiaW5hcnlUeXBlKTtcbiAgICAgICAgcGFja2V0cy5wdXNoKGRlY29kZWRQYWNrZXQpO1xuICAgICAgICBpZiAoZGVjb2RlZFBhY2tldC50eXBlID09PSBcImVycm9yXCIpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYWNrZXRzO1xufTtcbmV4cG9ydCBjb25zdCBwcm90b2NvbCA9IDQ7XG5leHBvcnQgeyBlbmNvZGVQYWNrZXQsIGVuY29kZVBheWxvYWQsIGRlY29kZVBhY2tldCwgZGVjb2RlUGF5bG9hZCB9O1xuIiwiLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBFbWl0dGVyKG9iaikge1xuICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcbn1cblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICh0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHRoaXMub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgLy8gYWxsXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNwZWNpZmljIGV2ZW50XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICB2YXIgY2I7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgZXZlbnQgc3BlY2lmaWMgYXJyYXlzIGZvciBldmVudCB0eXBlcyB0aGF0IG5vXG4gIC8vIG9uZSBpcyBzdWJzY3JpYmVkIGZvciB0byBhdm9pZCBtZW1vcnkgbGVhay5cbiAgaWYgKGNhbGxiYWNrcy5sZW5ndGggPT09IDApIHtcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpXG4gICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xuXG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gIH1cblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGFsaWFzIHVzZWQgZm9yIHJlc2VydmVkIGV2ZW50cyAocHJvdGVjdGVkIG1ldGhvZClcbkVtaXR0ZXIucHJvdG90eXBlLmVtaXRSZXNlcnZlZCA9IEVtaXR0ZXIucHJvdG90eXBlLmVtaXQ7XG5cbi8qKlxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgcmV0dXJuIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW107XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgcmV0dXJuICEhIHRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XG59O1xuIiwiZXhwb3J0IGNvbnN0IGdsb2JhbFRoaXNTaGltID0gKCgpID0+IHtcbiAgICBpZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgcmV0dXJuIHdpbmRvdztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBGdW5jdGlvbihcInJldHVybiB0aGlzXCIpKCk7XG4gICAgfVxufSkoKTtcbiIsImltcG9ydCB7IGdsb2JhbFRoaXNTaGltIGFzIGdsb2JhbFRoaXMgfSBmcm9tIFwiLi9nbG9iYWxUaGlzLmpzXCI7XG5leHBvcnQgZnVuY3Rpb24gcGljayhvYmosIC4uLmF0dHIpIHtcbiAgICByZXR1cm4gYXR0ci5yZWR1Y2UoKGFjYywgaykgPT4ge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICBhY2Nba10gPSBvYmpba107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG59XG4vLyBLZWVwIGEgcmVmZXJlbmNlIHRvIHRoZSByZWFsIHRpbWVvdXQgZnVuY3Rpb25zIHNvIHRoZXkgY2FuIGJlIHVzZWQgd2hlbiBvdmVycmlkZGVuXG5jb25zdCBOQVRJVkVfU0VUX1RJTUVPVVQgPSBnbG9iYWxUaGlzLnNldFRpbWVvdXQ7XG5jb25zdCBOQVRJVkVfQ0xFQVJfVElNRU9VVCA9IGdsb2JhbFRoaXMuY2xlYXJUaW1lb3V0O1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RhbGxUaW1lckZ1bmN0aW9ucyhvYmosIG9wdHMpIHtcbiAgICBpZiAob3B0cy51c2VOYXRpdmVUaW1lcnMpIHtcbiAgICAgICAgb2JqLnNldFRpbWVvdXRGbiA9IE5BVElWRV9TRVRfVElNRU9VVC5iaW5kKGdsb2JhbFRoaXMpO1xuICAgICAgICBvYmouY2xlYXJUaW1lb3V0Rm4gPSBOQVRJVkVfQ0xFQVJfVElNRU9VVC5iaW5kKGdsb2JhbFRoaXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgb2JqLnNldFRpbWVvdXRGbiA9IGdsb2JhbFRoaXMuc2V0VGltZW91dC5iaW5kKGdsb2JhbFRoaXMpO1xuICAgICAgICBvYmouY2xlYXJUaW1lb3V0Rm4gPSBnbG9iYWxUaGlzLmNsZWFyVGltZW91dC5iaW5kKGdsb2JhbFRoaXMpO1xuICAgIH1cbn1cbi8vIGJhc2U2NCBlbmNvZGVkIGJ1ZmZlcnMgYXJlIGFib3V0IDMzJSBiaWdnZXIgKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Jhc2U2NClcbmNvbnN0IEJBU0U2NF9PVkVSSEVBRCA9IDEuMzM7XG4vLyB3ZSBjb3VsZCBhbHNvIGhhdmUgdXNlZCBgbmV3IEJsb2IoW29ial0pLnNpemVgLCBidXQgaXQgaXNuJ3Qgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0IGZ1bmN0aW9uIGJ5dGVMZW5ndGgob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIHV0ZjhMZW5ndGgob2JqKTtcbiAgICB9XG4gICAgLy8gYXJyYXlidWZmZXIgb3IgYmxvYlxuICAgIHJldHVybiBNYXRoLmNlaWwoKG9iai5ieXRlTGVuZ3RoIHx8IG9iai5zaXplKSAqIEJBU0U2NF9PVkVSSEVBRCk7XG59XG5mdW5jdGlvbiB1dGY4TGVuZ3RoKHN0cikge1xuICAgIGxldCBjID0gMCwgbGVuZ3RoID0gMDtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHN0ci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBpZiAoYyA8IDB4ODApIHtcbiAgICAgICAgICAgIGxlbmd0aCArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGMgPCAweDgwMCkge1xuICAgICAgICAgICAgbGVuZ3RoICs9IDI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYyA8IDB4ZDgwMCB8fCBjID49IDB4ZTAwMCkge1xuICAgICAgICAgICAgbGVuZ3RoICs9IDM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBsZW5ndGggKz0gNDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGVuZ3RoO1xufVxuIiwiaW1wb3J0IHsgZGVjb2RlUGFja2V0IH0gZnJvbSBcImVuZ2luZS5pby1wYXJzZXJcIjtcbmltcG9ydCB7IEVtaXR0ZXIgfSBmcm9tIFwiQHNvY2tldC5pby9jb21wb25lbnQtZW1pdHRlclwiO1xuaW1wb3J0IHsgaW5zdGFsbFRpbWVyRnVuY3Rpb25zIH0gZnJvbSBcIi4vdXRpbC5qc1wiO1xuY2xhc3MgVHJhbnNwb3J0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICAgY29uc3RydWN0b3IocmVhc29uLCBkZXNjcmlwdGlvbiwgY29udGV4dCkge1xuICAgICAgICBzdXBlcihyZWFzb24pO1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMudHlwZSA9IFwiVHJhbnNwb3J0RXJyb3JcIjtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgVHJhbnNwb3J0IGV4dGVuZHMgRW1pdHRlciB7XG4gICAgLyoqXG4gICAgICogVHJhbnNwb3J0IGFic3RyYWN0IGNvbnN0cnVjdG9yLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgLSBvcHRpb25zXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy53cml0YWJsZSA9IGZhbHNlO1xuICAgICAgICBpbnN0YWxsVGltZXJGdW5jdGlvbnModGhpcywgb3B0cyk7XG4gICAgICAgIHRoaXMub3B0cyA9IG9wdHM7XG4gICAgICAgIHRoaXMucXVlcnkgPSBvcHRzLnF1ZXJ5O1xuICAgICAgICB0aGlzLnNvY2tldCA9IG9wdHMuc29ja2V0O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbWl0cyBhbiBlcnJvci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZWFzb25cbiAgICAgKiBAcGFyYW0gZGVzY3JpcHRpb25cbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIHRoZSBlcnJvciBjb250ZXh0XG4gICAgICogQHJldHVybiB7VHJhbnNwb3J0fSBmb3IgY2hhaW5pbmdcbiAgICAgKiBAcHJvdGVjdGVkXG4gICAgICovXG4gICAgb25FcnJvcihyZWFzb24sIGRlc2NyaXB0aW9uLCBjb250ZXh0KSB7XG4gICAgICAgIHN1cGVyLmVtaXRSZXNlcnZlZChcImVycm9yXCIsIG5ldyBUcmFuc3BvcnRFcnJvcihyZWFzb24sIGRlc2NyaXB0aW9uLCBjb250ZXh0KSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgdHJhbnNwb3J0LlxuICAgICAqL1xuICAgIG9wZW4oKSB7XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFwib3BlbmluZ1wiO1xuICAgICAgICB0aGlzLmRvT3BlbigpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIHRoZSB0cmFuc3BvcnQuXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IFwib3BlbmluZ1wiIHx8IHRoaXMucmVhZHlTdGF0ZSA9PT0gXCJvcGVuXCIpIHtcbiAgICAgICAgICAgIHRoaXMuZG9DbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5vbkNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNlbmRzIG11bHRpcGxlIHBhY2tldHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYWNrZXRzXG4gICAgICovXG4gICAgc2VuZChwYWNrZXRzKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IFwib3BlblwiKSB7XG4gICAgICAgICAgICB0aGlzLndyaXRlKHBhY2tldHMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhpcyBtaWdodCBoYXBwZW4gaWYgdGhlIHRyYW5zcG9ydCB3YXMgc2lsZW50bHkgY2xvc2VkIGluIHRoZSBiZWZvcmV1bmxvYWQgZXZlbnQgaGFuZGxlclxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIG9wZW5cbiAgICAgKlxuICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgKi9cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFwib3BlblwiO1xuICAgICAgICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgICAgc3VwZXIuZW1pdFJlc2VydmVkKFwib3BlblwiKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdpdGggZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIG9uRGF0YShkYXRhKSB7XG4gICAgICAgIGNvbnN0IHBhY2tldCA9IGRlY29kZVBhY2tldChkYXRhLCB0aGlzLnNvY2tldC5iaW5hcnlUeXBlKTtcbiAgICAgICAgdGhpcy5vblBhY2tldChwYWNrZXQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2l0aCBhIGRlY29kZWQgcGFja2V0LlxuICAgICAqXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIG9uUGFja2V0KHBhY2tldCkge1xuICAgICAgICBzdXBlci5lbWl0UmVzZXJ2ZWQoXCJwYWNrZXRcIiwgcGFja2V0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gY2xvc2UuXG4gICAgICpcbiAgICAgKiBAcHJvdGVjdGVkXG4gICAgICovXG4gICAgb25DbG9zZShkZXRhaWxzKSB7XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFwiY2xvc2VkXCI7XG4gICAgICAgIHN1cGVyLmVtaXRSZXNlcnZlZChcImNsb3NlXCIsIGRldGFpbHMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQYXVzZXMgdGhlIHRyYW5zcG9ydCwgaW4gb3JkZXIgbm90IHRvIGxvc2UgcGFja2V0cyBkdXJpbmcgYW4gdXBncmFkZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvblBhdXNlXG4gICAgICovXG4gICAgcGF1c2Uob25QYXVzZSkgeyB9XG59XG4iLCIvLyBpbXBvcnRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS91bnNoaWZ0aW8veWVhc3Rcbid1c2Ugc3RyaWN0JztcbmNvbnN0IGFscGhhYmV0ID0gJzAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6LV8nLnNwbGl0KCcnKSwgbGVuZ3RoID0gNjQsIG1hcCA9IHt9O1xubGV0IHNlZWQgPSAwLCBpID0gMCwgcHJldjtcbi8qKlxuICogUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgc3BlY2lmaWVkIG51bWJlci5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbnVtIFRoZSBudW1iZXIgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG51bWJlci5cbiAqIEBhcGkgcHVibGljXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGUobnVtKSB7XG4gICAgbGV0IGVuY29kZWQgPSAnJztcbiAgICBkbyB7XG4gICAgICAgIGVuY29kZWQgPSBhbHBoYWJldFtudW0gJSBsZW5ndGhdICsgZW5jb2RlZDtcbiAgICAgICAgbnVtID0gTWF0aC5mbG9vcihudW0gLyBsZW5ndGgpO1xuICAgIH0gd2hpbGUgKG51bSA+IDApO1xuICAgIHJldHVybiBlbmNvZGVkO1xufVxuLyoqXG4gKiBSZXR1cm4gdGhlIGludGVnZXIgdmFsdWUgc3BlY2lmaWVkIGJ5IHRoZSBnaXZlbiBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgc3RyaW5nIHRvIGNvbnZlcnQuXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgaW50ZWdlciB2YWx1ZSByZXByZXNlbnRlZCBieSB0aGUgc3RyaW5nLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZShzdHIpIHtcbiAgICBsZXQgZGVjb2RlZCA9IDA7XG4gICAgZm9yIChpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICBkZWNvZGVkID0gZGVjb2RlZCAqIGxlbmd0aCArIG1hcFtzdHIuY2hhckF0KGkpXTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29kZWQ7XG59XG4vKipcbiAqIFllYXN0OiBBIHRpbnkgZ3Jvd2luZyBpZCBnZW5lcmF0b3IuXG4gKlxuICogQHJldHVybnMge1N0cmluZ30gQSB1bmlxdWUgaWQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5leHBvcnQgZnVuY3Rpb24geWVhc3QoKSB7XG4gICAgY29uc3Qgbm93ID0gZW5jb2RlKCtuZXcgRGF0ZSgpKTtcbiAgICBpZiAobm93ICE9PSBwcmV2KVxuICAgICAgICByZXR1cm4gc2VlZCA9IDAsIHByZXYgPSBub3c7XG4gICAgcmV0dXJuIG5vdyArICcuJyArIGVuY29kZShzZWVkKyspO1xufVxuLy9cbi8vIE1hcCBlYWNoIGNoYXJhY3RlciB0byBpdHMgaW5kZXguXG4vL1xuZm9yICg7IGkgPCBsZW5ndGg7IGkrKylcbiAgICBtYXBbYWxwaGFiZXRbaV1dID0gaTtcbiIsIi8vIGltcG9ydGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2dhbGtuL3F1ZXJ5c3RyaW5nXG4vKipcbiAqIENvbXBpbGVzIGEgcXVlcnlzdHJpbmdcbiAqIFJldHVybnMgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlKG9iaikge1xuICAgIGxldCBzdHIgPSAnJztcbiAgICBmb3IgKGxldCBpIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICBpZiAoc3RyLmxlbmd0aClcbiAgICAgICAgICAgICAgICBzdHIgKz0gJyYnO1xuICAgICAgICAgICAgc3RyICs9IGVuY29kZVVSSUNvbXBvbmVudChpKSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChvYmpbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG4vKipcbiAqIFBhcnNlcyBhIHNpbXBsZSBxdWVyeXN0cmluZyBpbnRvIGFuIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBxc1xuICogQGFwaSBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGUocXMpIHtcbiAgICBsZXQgcXJ5ID0ge307XG4gICAgbGV0IHBhaXJzID0gcXMuc3BsaXQoJyYnKTtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IHBhaXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBsZXQgcGFpciA9IHBhaXJzW2ldLnNwbGl0KCc9Jyk7XG4gICAgICAgIHFyeVtkZWNvZGVVUklDb21wb25lbnQocGFpclswXSldID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhaXJbMV0pO1xuICAgIH1cbiAgICByZXR1cm4gcXJ5O1xufVxuIiwiLy8gaW1wb3J0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vY29tcG9uZW50L2hhcy1jb3JzXG5sZXQgdmFsdWUgPSBmYWxzZTtcbnRyeSB7XG4gICAgdmFsdWUgPSB0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICd3aXRoQ3JlZGVudGlhbHMnIGluIG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xufVxuY2F0Y2ggKGVycikge1xuICAgIC8vIGlmIFhNTEh0dHAgc3VwcG9ydCBpcyBkaXNhYmxlZCBpbiBJRSB0aGVuIGl0IHdpbGwgdGhyb3dcbiAgICAvLyB3aGVuIHRyeWluZyB0byBjcmVhdGVcbn1cbmV4cG9ydCBjb25zdCBoYXNDT1JTID0gdmFsdWU7XG4iLCIvLyBicm93c2VyIHNoaW0gZm9yIHhtbGh0dHByZXF1ZXN0IG1vZHVsZVxuaW1wb3J0IHsgaGFzQ09SUyB9IGZyb20gXCIuLi9jb250cmliL2hhcy1jb3JzLmpzXCI7XG5pbXBvcnQgeyBnbG9iYWxUaGlzU2hpbSBhcyBnbG9iYWxUaGlzIH0gZnJvbSBcIi4uL2dsb2JhbFRoaXMuanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBYSFIob3B0cykge1xuICAgIGNvbnN0IHhkb21haW4gPSBvcHRzLnhkb21haW47XG4gICAgLy8gWE1MSHR0cFJlcXVlc3QgY2FuIGJlIGRpc2FibGVkIG9uIElFXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKFwidW5kZWZpbmVkXCIgIT09IHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAmJiAoIXhkb21haW4gfHwgaGFzQ09SUykpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkgeyB9XG4gICAgaWYgKCF4ZG9tYWluKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IGdsb2JhbFRoaXNbW1wiQWN0aXZlXCJdLmNvbmNhdChcIk9iamVjdFwiKS5qb2luKFwiWFwiKV0oXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkgeyB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVHJhbnNwb3J0IH0gZnJvbSBcIi4uL3RyYW5zcG9ydC5qc1wiO1xuaW1wb3J0IHsgeWVhc3QgfSBmcm9tIFwiLi4vY29udHJpYi95ZWFzdC5qc1wiO1xuaW1wb3J0IHsgZW5jb2RlIH0gZnJvbSBcIi4uL2NvbnRyaWIvcGFyc2Vxcy5qc1wiO1xuaW1wb3J0IHsgZW5jb2RlUGF5bG9hZCwgZGVjb2RlUGF5bG9hZCB9IGZyb20gXCJlbmdpbmUuaW8tcGFyc2VyXCI7XG5pbXBvcnQgeyBYSFIgYXMgWE1MSHR0cFJlcXVlc3QgfSBmcm9tIFwiLi94bWxodHRwcmVxdWVzdC5qc1wiO1xuaW1wb3J0IHsgRW1pdHRlciB9IGZyb20gXCJAc29ja2V0LmlvL2NvbXBvbmVudC1lbWl0dGVyXCI7XG5pbXBvcnQgeyBpbnN0YWxsVGltZXJGdW5jdGlvbnMsIHBpY2sgfSBmcm9tIFwiLi4vdXRpbC5qc1wiO1xuaW1wb3J0IHsgZ2xvYmFsVGhpc1NoaW0gYXMgZ2xvYmFsVGhpcyB9IGZyb20gXCIuLi9nbG9iYWxUaGlzLmpzXCI7XG5mdW5jdGlvbiBlbXB0eSgpIHsgfVxuY29uc3QgaGFzWEhSMiA9IChmdW5jdGlvbiAoKSB7XG4gICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KHtcbiAgICAgICAgeGRvbWFpbjogZmFsc2UsXG4gICAgfSk7XG4gICAgcmV0dXJuIG51bGwgIT0geGhyLnJlc3BvbnNlVHlwZTtcbn0pKCk7XG5leHBvcnQgY2xhc3MgUG9sbGluZyBleHRlbmRzIFRyYW5zcG9ydCB7XG4gICAgLyoqXG4gICAgICogWEhSIFBvbGxpbmcgY29uc3RydWN0b3IuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0c1xuICAgICAqIEBwYWNrYWdlXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3B0cykge1xuICAgICAgICBzdXBlcihvcHRzKTtcbiAgICAgICAgdGhpcy5wb2xsaW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0eXBlb2YgbG9jYXRpb24gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzU1NMID0gXCJodHRwczpcIiA9PT0gbG9jYXRpb24ucHJvdG9jb2w7XG4gICAgICAgICAgICBsZXQgcG9ydCA9IGxvY2F0aW9uLnBvcnQ7XG4gICAgICAgICAgICAvLyBzb21lIHVzZXIgYWdlbnRzIGhhdmUgZW1wdHkgYGxvY2F0aW9uLnBvcnRgXG4gICAgICAgICAgICBpZiAoIXBvcnQpIHtcbiAgICAgICAgICAgICAgICBwb3J0ID0gaXNTU0wgPyBcIjQ0M1wiIDogXCI4MFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy54ZCA9XG4gICAgICAgICAgICAgICAgKHR5cGVvZiBsb2NhdGlvbiAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICAgICAgICAgICAgICBvcHRzLmhvc3RuYW1lICE9PSBsb2NhdGlvbi5ob3N0bmFtZSkgfHxcbiAgICAgICAgICAgICAgICAgICAgcG9ydCAhPT0gb3B0cy5wb3J0O1xuICAgICAgICAgICAgdGhpcy54cyA9IG9wdHMuc2VjdXJlICE9PSBpc1NTTDtcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogWEhSIHN1cHBvcnRzIGJpbmFyeVxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgZm9yY2VCYXNlNjQgPSBvcHRzICYmIG9wdHMuZm9yY2VCYXNlNjQ7XG4gICAgICAgIHRoaXMuc3VwcG9ydHNCaW5hcnkgPSBoYXNYSFIyICYmICFmb3JjZUJhc2U2NDtcbiAgICB9XG4gICAgZ2V0IG5hbWUoKSB7XG4gICAgICAgIHJldHVybiBcInBvbGxpbmdcIjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIHNvY2tldCAodHJpZ2dlcnMgcG9sbGluZykuIFdlIHdyaXRlIGEgUElORyBtZXNzYWdlIHRvIGRldGVybWluZVxuICAgICAqIHdoZW4gdGhlIHRyYW5zcG9ydCBpcyBvcGVuLlxuICAgICAqXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIGRvT3BlbigpIHtcbiAgICAgICAgdGhpcy5wb2xsKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBhdXNlcyBwb2xsaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gb25QYXVzZSAtIGNhbGxiYWNrIHVwb24gYnVmZmVycyBhcmUgZmx1c2hlZCBhbmQgdHJhbnNwb3J0IGlzIHBhdXNlZFxuICAgICAqIEBwYWNrYWdlXG4gICAgICovXG4gICAgcGF1c2Uob25QYXVzZSkge1xuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBcInBhdXNpbmdcIjtcbiAgICAgICAgY29uc3QgcGF1c2UgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBcInBhdXNlZFwiO1xuICAgICAgICAgICAgb25QYXVzZSgpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5wb2xsaW5nIHx8ICF0aGlzLndyaXRhYmxlKSB7XG4gICAgICAgICAgICBsZXQgdG90YWwgPSAwO1xuICAgICAgICAgICAgaWYgKHRoaXMucG9sbGluZykge1xuICAgICAgICAgICAgICAgIHRvdGFsKys7XG4gICAgICAgICAgICAgICAgdGhpcy5vbmNlKFwicG9sbENvbXBsZXRlXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLS10b3RhbCB8fCBwYXVzZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGlzLndyaXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgdG90YWwrKztcbiAgICAgICAgICAgICAgICB0aGlzLm9uY2UoXCJkcmFpblwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC0tdG90YWwgfHwgcGF1c2UoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBhdXNlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogU3RhcnRzIHBvbGxpbmcgY3ljbGUuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHBvbGwoKSB7XG4gICAgICAgIHRoaXMucG9sbGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuZG9Qb2xsKCk7XG4gICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicG9sbFwiKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogT3ZlcmxvYWRzIG9uRGF0YSB0byBkZXRlY3QgcGF5bG9hZHMuXG4gICAgICpcbiAgICAgKiBAcHJvdGVjdGVkXG4gICAgICovXG4gICAgb25EYXRhKGRhdGEpIHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAocGFja2V0KSA9PiB7XG4gICAgICAgICAgICAvLyBpZiBpdHMgdGhlIGZpcnN0IG1lc3NhZ2Ugd2UgY29uc2lkZXIgdGhlIHRyYW5zcG9ydCBvcGVuXG4gICAgICAgICAgICBpZiAoXCJvcGVuaW5nXCIgPT09IHRoaXMucmVhZHlTdGF0ZSAmJiBwYWNrZXQudHlwZSA9PT0gXCJvcGVuXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uT3BlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWYgaXRzIGEgY2xvc2UgcGFja2V0LCB3ZSBjbG9zZSB0aGUgb25nb2luZyByZXF1ZXN0c1xuICAgICAgICAgICAgaWYgKFwiY2xvc2VcIiA9PT0gcGFja2V0LnR5cGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2xvc2UoeyBkZXNjcmlwdGlvbjogXCJ0cmFuc3BvcnQgY2xvc2VkIGJ5IHRoZSBzZXJ2ZXJcIiB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgYnlwYXNzIG9uRGF0YSBhbmQgaGFuZGxlIHRoZSBtZXNzYWdlXG4gICAgICAgICAgICB0aGlzLm9uUGFja2V0KHBhY2tldCk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIGRlY29kZSBwYXlsb2FkXG4gICAgICAgIGRlY29kZVBheWxvYWQoZGF0YSwgdGhpcy5zb2NrZXQuYmluYXJ5VHlwZSkuZm9yRWFjaChjYWxsYmFjayk7XG4gICAgICAgIC8vIGlmIGFuIGV2ZW50IGRpZCBub3QgdHJpZ2dlciBjbG9zaW5nXG4gICAgICAgIGlmIChcImNsb3NlZFwiICE9PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIGdvdCBkYXRhIHdlJ3JlIG5vdCBwb2xsaW5nXG4gICAgICAgICAgICB0aGlzLnBvbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicG9sbENvbXBsZXRlXCIpO1xuICAgICAgICAgICAgaWYgKFwib3BlblwiID09PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZvciBwb2xsaW5nLCBzZW5kIGEgY2xvc2UgcGFja2V0LlxuICAgICAqXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIGRvQ2xvc2UoKSB7XG4gICAgICAgIGNvbnN0IGNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy53cml0ZShbeyB0eXBlOiBcImNsb3NlXCIgfV0pO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoXCJvcGVuXCIgPT09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgY2xvc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGluIGNhc2Ugd2UncmUgdHJ5aW5nIHRvIGNsb3NlIHdoaWxlXG4gICAgICAgICAgICAvLyBoYW5kc2hha2luZyBpcyBpbiBwcm9ncmVzcyAoR0gtMTY0KVxuICAgICAgICAgICAgdGhpcy5vbmNlKFwib3BlblwiLCBjbG9zZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogV3JpdGVzIGEgcGFja2V0cyBwYXlsb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGFja2V0cyAtIGRhdGEgcGFja2V0c1xuICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgKi9cbiAgICB3cml0ZShwYWNrZXRzKSB7XG4gICAgICAgIHRoaXMud3JpdGFibGUgPSBmYWxzZTtcbiAgICAgICAgZW5jb2RlUGF5bG9hZChwYWNrZXRzLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kb1dyaXRlKGRhdGEsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImRyYWluXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgdXJpIGZvciBjb25uZWN0aW9uLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB1cmkoKSB7XG4gICAgICAgIGxldCBxdWVyeSA9IHRoaXMucXVlcnkgfHwge307XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHRoaXMub3B0cy5zZWN1cmUgPyBcImh0dHBzXCIgOiBcImh0dHBcIjtcbiAgICAgICAgbGV0IHBvcnQgPSBcIlwiO1xuICAgICAgICAvLyBjYWNoZSBidXN0aW5nIGlzIGZvcmNlZFxuICAgICAgICBpZiAoZmFsc2UgIT09IHRoaXMub3B0cy50aW1lc3RhbXBSZXF1ZXN0cykge1xuICAgICAgICAgICAgcXVlcnlbdGhpcy5vcHRzLnRpbWVzdGFtcFBhcmFtXSA9IHllYXN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnN1cHBvcnRzQmluYXJ5ICYmICFxdWVyeS5zaWQpIHtcbiAgICAgICAgICAgIHF1ZXJ5LmI2NCA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYXZvaWQgcG9ydCBpZiBkZWZhdWx0IGZvciBzY2hlbWFcbiAgICAgICAgaWYgKHRoaXMub3B0cy5wb3J0ICYmXG4gICAgICAgICAgICAoKFwiaHR0cHNcIiA9PT0gc2NoZW1hICYmIE51bWJlcih0aGlzLm9wdHMucG9ydCkgIT09IDQ0MykgfHxcbiAgICAgICAgICAgICAgICAoXCJodHRwXCIgPT09IHNjaGVtYSAmJiBOdW1iZXIodGhpcy5vcHRzLnBvcnQpICE9PSA4MCkpKSB7XG4gICAgICAgICAgICBwb3J0ID0gXCI6XCIgKyB0aGlzLm9wdHMucG9ydDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbmNvZGVkUXVlcnkgPSBlbmNvZGUocXVlcnkpO1xuICAgICAgICBjb25zdCBpcHY2ID0gdGhpcy5vcHRzLmhvc3RuYW1lLmluZGV4T2YoXCI6XCIpICE9PSAtMTtcbiAgICAgICAgcmV0dXJuIChzY2hlbWEgK1xuICAgICAgICAgICAgXCI6Ly9cIiArXG4gICAgICAgICAgICAoaXB2NiA/IFwiW1wiICsgdGhpcy5vcHRzLmhvc3RuYW1lICsgXCJdXCIgOiB0aGlzLm9wdHMuaG9zdG5hbWUpICtcbiAgICAgICAgICAgIHBvcnQgK1xuICAgICAgICAgICAgdGhpcy5vcHRzLnBhdGggK1xuICAgICAgICAgICAgKGVuY29kZWRRdWVyeS5sZW5ndGggPyBcIj9cIiArIGVuY29kZWRRdWVyeSA6IFwiXCIpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHJlcXVlc3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICByZXF1ZXN0KG9wdHMgPSB7fSkge1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdHMsIHsgeGQ6IHRoaXMueGQsIHhzOiB0aGlzLnhzIH0sIHRoaXMub3B0cyk7XG4gICAgICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLnVyaSgpLCBvcHRzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2VuZHMgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhIHRvIHNlbmQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGVkIHVwb24gZmx1c2guXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBkb1dyaXRlKGRhdGEsIGZuKSB7XG4gICAgICAgIGNvbnN0IHJlcSA9IHRoaXMucmVxdWVzdCh7XG4gICAgICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJlcS5vbihcInN1Y2Nlc3NcIiwgZm4pO1xuICAgICAgICByZXEub24oXCJlcnJvclwiLCAoeGhyU3RhdHVzLCBjb250ZXh0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uRXJyb3IoXCJ4aHIgcG9zdCBlcnJvclwiLCB4aHJTdGF0dXMsIGNvbnRleHQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3RhcnRzIGEgcG9sbCBjeWNsZS5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZG9Qb2xsKCkge1xuICAgICAgICBjb25zdCByZXEgPSB0aGlzLnJlcXVlc3QoKTtcbiAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCB0aGlzLm9uRGF0YS5iaW5kKHRoaXMpKTtcbiAgICAgICAgcmVxLm9uKFwiZXJyb3JcIiwgKHhoclN0YXR1cywgY29udGV4dCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbkVycm9yKFwieGhyIHBvbGwgZXJyb3JcIiwgeGhyU3RhdHVzLCBjb250ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucG9sbFhociA9IHJlcTtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgUmVxdWVzdCBleHRlbmRzIEVtaXR0ZXIge1xuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gICAgICogQHBhY2thZ2VcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih1cmksIG9wdHMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgaW5zdGFsbFRpbWVyRnVuY3Rpb25zKHRoaXMsIG9wdHMpO1xuICAgICAgICB0aGlzLm9wdHMgPSBvcHRzO1xuICAgICAgICB0aGlzLm1ldGhvZCA9IG9wdHMubWV0aG9kIHx8IFwiR0VUXCI7XG4gICAgICAgIHRoaXMudXJpID0gdXJpO1xuICAgICAgICB0aGlzLmFzeW5jID0gZmFsc2UgIT09IG9wdHMuYXN5bmM7XG4gICAgICAgIHRoaXMuZGF0YSA9IHVuZGVmaW5lZCAhPT0gb3B0cy5kYXRhID8gb3B0cy5kYXRhIDogbnVsbDtcbiAgICAgICAgdGhpcy5jcmVhdGUoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyB0aGUgWEhSIG9iamVjdCBhbmQgc2VuZHMgdGhlIHJlcXVlc3QuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGNyZWF0ZSgpIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHBpY2sodGhpcy5vcHRzLCBcImFnZW50XCIsIFwicGZ4XCIsIFwia2V5XCIsIFwicGFzc3BocmFzZVwiLCBcImNlcnRcIiwgXCJjYVwiLCBcImNpcGhlcnNcIiwgXCJyZWplY3RVbmF1dGhvcml6ZWRcIiwgXCJhdXRvVW5yZWZcIik7XG4gICAgICAgIG9wdHMueGRvbWFpbiA9ICEhdGhpcy5vcHRzLnhkO1xuICAgICAgICBvcHRzLnhzY2hlbWUgPSAhIXRoaXMub3B0cy54cztcbiAgICAgICAgY29uc3QgeGhyID0gKHRoaXMueGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KG9wdHMpKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHhoci5vcGVuKHRoaXMubWV0aG9kLCB0aGlzLnVyaSwgdGhpcy5hc3luYyk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuZXh0cmFIZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHhoci5zZXREaXNhYmxlSGVhZGVyQ2hlY2sgJiYgeGhyLnNldERpc2FibGVIZWFkZXJDaGVjayh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSBpbiB0aGlzLm9wdHMuZXh0cmFIZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRzLmV4dHJhSGVhZGVycy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGksIHRoaXMub3B0cy5leHRyYUhlYWRlcnNbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHsgfVxuICAgICAgICAgICAgaWYgKFwiUE9TVFwiID09PSB0aGlzLm1ldGhvZCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC10eXBlXCIsIFwidGV4dC9wbGFpbjtjaGFyc2V0PVVURi04XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkgeyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwiKi8qXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHsgfVxuICAgICAgICAgICAgLy8gaWU2IGNoZWNrXG4gICAgICAgICAgICBpZiAoXCJ3aXRoQ3JlZGVudGlhbHNcIiBpbiB4aHIpIHtcbiAgICAgICAgICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdGhpcy5vcHRzLndpdGhDcmVkZW50aWFscztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMucmVxdWVzdFRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICB4aHIudGltZW91dCA9IHRoaXMub3B0cy5yZXF1ZXN0VGltZW91dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKDQgIT09IHhoci5yZWFkeVN0YXRlKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKDIwMCA9PT0geGhyLnN0YXR1cyB8fCAxMjIzID09PSB4aHIuc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25Mb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIGBlcnJvcmAgZXZlbnQgaGFuZGxlciB0aGF0J3MgdXNlci1zZXRcbiAgICAgICAgICAgICAgICAgICAgLy8gZG9lcyBub3QgdGhyb3cgaW4gdGhlIHNhbWUgdGljayBhbmQgZ2V0cyBjYXVnaHQgaGVyZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFRpbWVvdXRGbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRXJyb3IodHlwZW9mIHhoci5zdGF0dXMgPT09IFwibnVtYmVyXCIgPyB4aHIuc3RhdHVzIDogMCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB4aHIuc2VuZCh0aGlzLmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBOZWVkIHRvIGRlZmVyIHNpbmNlIC5jcmVhdGUoKSBpcyBjYWxsZWQgZGlyZWN0bHkgZnJvbSB0aGUgY29uc3RydWN0b3JcbiAgICAgICAgICAgIC8vIGFuZCB0aHVzIHRoZSAnZXJyb3InIGV2ZW50IGNhbiBvbmx5IGJlIG9ubHkgYm91bmQgKmFmdGVyKiB0aGlzIGV4Y2VwdGlvblxuICAgICAgICAgICAgLy8gb2NjdXJzLiAgVGhlcmVmb3JlLCBhbHNvLCB3ZSBjYW5ub3QgdGhyb3cgaGVyZSBhdCBhbGwuXG4gICAgICAgICAgICB0aGlzLnNldFRpbWVvdXRGbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkVycm9yKGUpO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy5pbmRleCA9IFJlcXVlc3QucmVxdWVzdHNDb3VudCsrO1xuICAgICAgICAgICAgUmVxdWVzdC5yZXF1ZXN0c1t0aGlzLmluZGV4XSA9IHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gZXJyb3IuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uRXJyb3IoZXJyKSB7XG4gICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwiZXJyb3JcIiwgZXJyLCB0aGlzLnhocik7XG4gICAgICAgIHRoaXMuY2xlYW51cCh0cnVlKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYW5zIHVwIGhvdXNlLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBjbGVhbnVwKGZyb21FcnJvcikge1xuICAgICAgICBpZiAoXCJ1bmRlZmluZWRcIiA9PT0gdHlwZW9mIHRoaXMueGhyIHx8IG51bGwgPT09IHRoaXMueGhyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZW1wdHk7XG4gICAgICAgIGlmIChmcm9tRXJyb3IpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy54aHIuYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlKSB7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICBkZWxldGUgUmVxdWVzdC5yZXF1ZXN0c1t0aGlzLmluZGV4XTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnhociA9IG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIGxvYWQuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uTG9hZCgpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMueGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgaWYgKGRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwiZGF0YVwiLCBkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgIHRoaXMuY2xlYW51cCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFib3J0cyB0aGUgcmVxdWVzdC5cbiAgICAgKlxuICAgICAqIEBwYWNrYWdlXG4gICAgICovXG4gICAgYWJvcnQoKSB7XG4gICAgICAgIHRoaXMuY2xlYW51cCgpO1xuICAgIH1cbn1cblJlcXVlc3QucmVxdWVzdHNDb3VudCA9IDA7XG5SZXF1ZXN0LnJlcXVlc3RzID0ge307XG4vKipcbiAqIEFib3J0cyBwZW5kaW5nIHJlcXVlc3RzIHdoZW4gdW5sb2FkaW5nIHRoZSB3aW5kb3cuIFRoaXMgaXMgbmVlZGVkIHRvIHByZXZlbnRcbiAqIG1lbW9yeSBsZWFrcyAoZS5nLiB3aGVuIHVzaW5nIElFKSBhbmQgdG8gZW5zdXJlIHRoYXQgbm8gc3B1cmlvdXMgZXJyb3IgaXNcbiAqIGVtaXR0ZWQuXG4gKi9cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgaWYgKHR5cGVvZiBhdHRhY2hFdmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgYXR0YWNoRXZlbnQoXCJvbnVubG9hZFwiLCB1bmxvYWRIYW5kbGVyKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFkZEV2ZW50TGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBjb25zdCB0ZXJtaW5hdGlvbkV2ZW50ID0gXCJvbnBhZ2VoaWRlXCIgaW4gZ2xvYmFsVGhpcyA/IFwicGFnZWhpZGVcIiA6IFwidW5sb2FkXCI7XG4gICAgICAgIGFkZEV2ZW50TGlzdGVuZXIodGVybWluYXRpb25FdmVudCwgdW5sb2FkSGFuZGxlciwgZmFsc2UpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHVubG9hZEhhbmRsZXIoKSB7XG4gICAgZm9yIChsZXQgaSBpbiBSZXF1ZXN0LnJlcXVlc3RzKSB7XG4gICAgICAgIGlmIChSZXF1ZXN0LnJlcXVlc3RzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICBSZXF1ZXN0LnJlcXVlc3RzW2ldLmFib3J0KCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBnbG9iYWxUaGlzU2hpbSBhcyBnbG9iYWxUaGlzIH0gZnJvbSBcIi4uL2dsb2JhbFRoaXMuanNcIjtcbmV4cG9ydCBjb25zdCBuZXh0VGljayA9ICgoKSA9PiB7XG4gICAgY29uc3QgaXNQcm9taXNlQXZhaWxhYmxlID0gdHlwZW9mIFByb21pc2UgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgUHJvbWlzZS5yZXNvbHZlID09PSBcImZ1bmN0aW9uXCI7XG4gICAgaWYgKGlzUHJvbWlzZUF2YWlsYWJsZSkge1xuICAgICAgICByZXR1cm4gKGNiKSA9PiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGNiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiAoY2IsIHNldFRpbWVvdXRGbikgPT4gc2V0VGltZW91dEZuKGNiLCAwKTtcbiAgICB9XG59KSgpO1xuZXhwb3J0IGNvbnN0IFdlYlNvY2tldCA9IGdsb2JhbFRoaXMuV2ViU29ja2V0IHx8IGdsb2JhbFRoaXMuTW96V2ViU29ja2V0O1xuZXhwb3J0IGNvbnN0IHVzaW5nQnJvd3NlcldlYlNvY2tldCA9IHRydWU7XG5leHBvcnQgY29uc3QgZGVmYXVsdEJpbmFyeVR5cGUgPSBcImFycmF5YnVmZmVyXCI7XG4iLCJpbXBvcnQgeyBUcmFuc3BvcnQgfSBmcm9tIFwiLi4vdHJhbnNwb3J0LmpzXCI7XG5pbXBvcnQgeyBlbmNvZGUgfSBmcm9tIFwiLi4vY29udHJpYi9wYXJzZXFzLmpzXCI7XG5pbXBvcnQgeyB5ZWFzdCB9IGZyb20gXCIuLi9jb250cmliL3llYXN0LmpzXCI7XG5pbXBvcnQgeyBwaWNrIH0gZnJvbSBcIi4uL3V0aWwuanNcIjtcbmltcG9ydCB7IGRlZmF1bHRCaW5hcnlUeXBlLCBuZXh0VGljaywgdXNpbmdCcm93c2VyV2ViU29ja2V0LCBXZWJTb2NrZXQsIH0gZnJvbSBcIi4vd2Vic29ja2V0LWNvbnN0cnVjdG9yLmpzXCI7XG5pbXBvcnQgeyBlbmNvZGVQYWNrZXQgfSBmcm9tIFwiZW5naW5lLmlvLXBhcnNlclwiO1xuLy8gZGV0ZWN0IFJlYWN0TmF0aXZlIGVudmlyb25tZW50XG5jb25zdCBpc1JlYWN0TmF0aXZlID0gdHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgIHR5cGVvZiBuYXZpZ2F0b3IucHJvZHVjdCA9PT0gXCJzdHJpbmdcIiAmJlxuICAgIG5hdmlnYXRvci5wcm9kdWN0LnRvTG93ZXJDYXNlKCkgPT09IFwicmVhY3RuYXRpdmVcIjtcbmV4cG9ydCBjbGFzcyBXUyBleHRlbmRzIFRyYW5zcG9ydCB7XG4gICAgLyoqXG4gICAgICogV2ViU29ja2V0IHRyYW5zcG9ydCBjb25zdHJ1Y3Rvci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIC0gY29ubmVjdGlvbiBvcHRpb25zXG4gICAgICogQHByb3RlY3RlZFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG4gICAgICAgIHRoaXMuc3VwcG9ydHNCaW5hcnkgPSAhb3B0cy5mb3JjZUJhc2U2NDtcbiAgICB9XG4gICAgZ2V0IG5hbWUoKSB7XG4gICAgICAgIHJldHVybiBcIndlYnNvY2tldFwiO1xuICAgIH1cbiAgICBkb09wZW4oKSB7XG4gICAgICAgIGlmICghdGhpcy5jaGVjaygpKSB7XG4gICAgICAgICAgICAvLyBsZXQgcHJvYmUgdGltZW91dFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVyaSA9IHRoaXMudXJpKCk7XG4gICAgICAgIGNvbnN0IHByb3RvY29scyA9IHRoaXMub3B0cy5wcm90b2NvbHM7XG4gICAgICAgIC8vIFJlYWN0IE5hdGl2ZSBvbmx5IHN1cHBvcnRzIHRoZSAnaGVhZGVycycgb3B0aW9uLCBhbmQgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgYW55dGhpbmcgZWxzZSBpcyBwYXNzZWRcbiAgICAgICAgY29uc3Qgb3B0cyA9IGlzUmVhY3ROYXRpdmVcbiAgICAgICAgICAgID8ge31cbiAgICAgICAgICAgIDogcGljayh0aGlzLm9wdHMsIFwiYWdlbnRcIiwgXCJwZXJNZXNzYWdlRGVmbGF0ZVwiLCBcInBmeFwiLCBcImtleVwiLCBcInBhc3NwaHJhc2VcIiwgXCJjZXJ0XCIsIFwiY2FcIiwgXCJjaXBoZXJzXCIsIFwicmVqZWN0VW5hdXRob3JpemVkXCIsIFwibG9jYWxBZGRyZXNzXCIsIFwicHJvdG9jb2xWZXJzaW9uXCIsIFwib3JpZ2luXCIsIFwibWF4UGF5bG9hZFwiLCBcImZhbWlseVwiLCBcImNoZWNrU2VydmVySWRlbnRpdHlcIik7XG4gICAgICAgIGlmICh0aGlzLm9wdHMuZXh0cmFIZWFkZXJzKSB7XG4gICAgICAgICAgICBvcHRzLmhlYWRlcnMgPSB0aGlzLm9wdHMuZXh0cmFIZWFkZXJzO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLndzID1cbiAgICAgICAgICAgICAgICB1c2luZ0Jyb3dzZXJXZWJTb2NrZXQgJiYgIWlzUmVhY3ROYXRpdmVcbiAgICAgICAgICAgICAgICAgICAgPyBwcm90b2NvbHNcbiAgICAgICAgICAgICAgICAgICAgICAgID8gbmV3IFdlYlNvY2tldCh1cmksIHByb3RvY29scylcbiAgICAgICAgICAgICAgICAgICAgICAgIDogbmV3IFdlYlNvY2tldCh1cmkpXG4gICAgICAgICAgICAgICAgICAgIDogbmV3IFdlYlNvY2tldCh1cmksIHByb3RvY29scywgb3B0cyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW1pdFJlc2VydmVkKFwiZXJyb3JcIiwgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLndzLmJpbmFyeVR5cGUgPSB0aGlzLnNvY2tldC5iaW5hcnlUeXBlIHx8IGRlZmF1bHRCaW5hcnlUeXBlO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBzb2NrZXRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XG4gICAgICAgIHRoaXMud3Mub25vcGVuID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMub3B0cy5hdXRvVW5yZWYpIHtcbiAgICAgICAgICAgICAgICB0aGlzLndzLl9zb2NrZXQudW5yZWYoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMud3Mub25jbG9zZSA9IChjbG9zZUV2ZW50KSA9PiB0aGlzLm9uQ2xvc2Uoe1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwid2Vic29ja2V0IGNvbm5lY3Rpb24gY2xvc2VkXCIsXG4gICAgICAgICAgICBjb250ZXh0OiBjbG9zZUV2ZW50LFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy53cy5vbm1lc3NhZ2UgPSAoZXYpID0+IHRoaXMub25EYXRhKGV2LmRhdGEpO1xuICAgICAgICB0aGlzLndzLm9uZXJyb3IgPSAoZSkgPT4gdGhpcy5vbkVycm9yKFwid2Vic29ja2V0IGVycm9yXCIsIGUpO1xuICAgIH1cbiAgICB3cml0ZShwYWNrZXRzKSB7XG4gICAgICAgIHRoaXMud3JpdGFibGUgPSBmYWxzZTtcbiAgICAgICAgLy8gZW5jb2RlUGFja2V0IGVmZmljaWVudCBhcyBpdCB1c2VzIFdTIGZyYW1pbmdcbiAgICAgICAgLy8gbm8gbmVlZCBmb3IgZW5jb2RlUGF5bG9hZFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhY2tldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldCA9IHBhY2tldHNbaV07XG4gICAgICAgICAgICBjb25zdCBsYXN0UGFja2V0ID0gaSA9PT0gcGFja2V0cy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgZW5jb2RlUGFja2V0KHBhY2tldCwgdGhpcy5zdXBwb3J0c0JpbmFyeSwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBhbHdheXMgY3JlYXRlIGEgbmV3IG9iamVjdCAoR0gtNDM3KVxuICAgICAgICAgICAgICAgIGNvbnN0IG9wdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAoIXVzaW5nQnJvd3NlcldlYlNvY2tldCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFja2V0Lm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdHMuY29tcHJlc3MgPSBwYWNrZXQub3B0aW9ucy5jb21wcmVzcztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vcHRzLnBlck1lc3NhZ2VEZWZsYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsZW4gPSBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic3RyaW5nXCIgPT09IHR5cGVvZiBkYXRhID8gQnVmZmVyLmJ5dGVMZW5ndGgoZGF0YSkgOiBkYXRhLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsZW4gPCB0aGlzLm9wdHMucGVyTWVzc2FnZURlZmxhdGUudGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0cy5jb21wcmVzcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNvbWV0aW1lcyB0aGUgd2Vic29ja2V0IGhhcyBhbHJlYWR5IGJlZW4gY2xvc2VkIGJ1dCB0aGUgYnJvd3NlciBkaWRuJ3RcbiAgICAgICAgICAgICAgICAvLyBoYXZlIGEgY2hhbmNlIG9mIGluZm9ybWluZyB1cyBhYm91dCBpdCB5ZXQsIGluIHRoYXQgY2FzZSBzZW5kIHdpbGxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdyBhbiBlcnJvclxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1c2luZ0Jyb3dzZXJXZWJTb2NrZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFR5cGVFcnJvciBpcyB0aHJvd24gd2hlbiBwYXNzaW5nIHRoZSBzZWNvbmQgYXJndW1lbnQgb24gU2FmYXJpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndzLnNlbmQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndzLnNlbmQoZGF0YSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RQYWNrZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZmFrZSBkcmFpblxuICAgICAgICAgICAgICAgICAgICAvLyBkZWZlciB0byBuZXh0IHRpY2sgdG8gYWxsb3cgU29ja2V0IHRvIGNsZWFyIHdyaXRlQnVmZmVyXG4gICAgICAgICAgICAgICAgICAgIG5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGFibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJkcmFpblwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgdGhpcy5zZXRUaW1lb3V0Rm4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRvQ2xvc2UoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy53cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy53cy5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy53cyA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIHVyaSBmb3IgY29ubmVjdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgdXJpKCkge1xuICAgICAgICBsZXQgcXVlcnkgPSB0aGlzLnF1ZXJ5IHx8IHt9O1xuICAgICAgICBjb25zdCBzY2hlbWEgPSB0aGlzLm9wdHMuc2VjdXJlID8gXCJ3c3NcIiA6IFwid3NcIjtcbiAgICAgICAgbGV0IHBvcnQgPSBcIlwiO1xuICAgICAgICAvLyBhdm9pZCBwb3J0IGlmIGRlZmF1bHQgZm9yIHNjaGVtYVxuICAgICAgICBpZiAodGhpcy5vcHRzLnBvcnQgJiZcbiAgICAgICAgICAgICgoXCJ3c3NcIiA9PT0gc2NoZW1hICYmIE51bWJlcih0aGlzLm9wdHMucG9ydCkgIT09IDQ0MykgfHxcbiAgICAgICAgICAgICAgICAoXCJ3c1wiID09PSBzY2hlbWEgJiYgTnVtYmVyKHRoaXMub3B0cy5wb3J0KSAhPT0gODApKSkge1xuICAgICAgICAgICAgcG9ydCA9IFwiOlwiICsgdGhpcy5vcHRzLnBvcnQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYXBwZW5kIHRpbWVzdGFtcCB0byBVUklcbiAgICAgICAgaWYgKHRoaXMub3B0cy50aW1lc3RhbXBSZXF1ZXN0cykge1xuICAgICAgICAgICAgcXVlcnlbdGhpcy5vcHRzLnRpbWVzdGFtcFBhcmFtXSA9IHllYXN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29tbXVuaWNhdGUgYmluYXJ5IHN1cHBvcnQgY2FwYWJpbGl0aWVzXG4gICAgICAgIGlmICghdGhpcy5zdXBwb3J0c0JpbmFyeSkge1xuICAgICAgICAgICAgcXVlcnkuYjY0ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbmNvZGVkUXVlcnkgPSBlbmNvZGUocXVlcnkpO1xuICAgICAgICBjb25zdCBpcHY2ID0gdGhpcy5vcHRzLmhvc3RuYW1lLmluZGV4T2YoXCI6XCIpICE9PSAtMTtcbiAgICAgICAgcmV0dXJuIChzY2hlbWEgK1xuICAgICAgICAgICAgXCI6Ly9cIiArXG4gICAgICAgICAgICAoaXB2NiA/IFwiW1wiICsgdGhpcy5vcHRzLmhvc3RuYW1lICsgXCJdXCIgOiB0aGlzLm9wdHMuaG9zdG5hbWUpICtcbiAgICAgICAgICAgIHBvcnQgK1xuICAgICAgICAgICAgdGhpcy5vcHRzLnBhdGggK1xuICAgICAgICAgICAgKGVuY29kZWRRdWVyeS5sZW5ndGggPyBcIj9cIiArIGVuY29kZWRRdWVyeSA6IFwiXCIpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRmVhdHVyZSBkZXRlY3Rpb24gZm9yIFdlYlNvY2tldC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgdGhpcyB0cmFuc3BvcnQgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgY2hlY2soKSB7XG4gICAgICAgIHJldHVybiAhIVdlYlNvY2tldDtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBQb2xsaW5nIH0gZnJvbSBcIi4vcG9sbGluZy5qc1wiO1xuaW1wb3J0IHsgV1MgfSBmcm9tIFwiLi93ZWJzb2NrZXQuanNcIjtcbmV4cG9ydCBjb25zdCB0cmFuc3BvcnRzID0ge1xuICAgIHdlYnNvY2tldDogV1MsXG4gICAgcG9sbGluZzogUG9sbGluZyxcbn07XG4iLCIvLyBpbXBvcnRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9nYWxrbi9wYXJzZXVyaVxuLyoqXG4gKiBQYXJzZXMgYSBVUklcbiAqXG4gKiBOb3RlOiB3ZSBjb3VsZCBhbHNvIGhhdmUgdXNlZCB0aGUgYnVpbHQtaW4gVVJMIG9iamVjdCwgYnV0IGl0IGlzbid0IHN1cHBvcnRlZCBvbiBhbGwgcGxhdGZvcm1zLlxuICpcbiAqIFNlZTpcbiAqIC0gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1VSTFxuICogLSBodHRwczovL2Nhbml1c2UuY29tL3VybFxuICogLSBodHRwczovL3d3dy5yZmMtZWRpdG9yLm9yZy9yZmMvcmZjMzk4NiNhcHBlbmRpeC1CXG4gKlxuICogSGlzdG9yeSBvZiB0aGUgcGFyc2UoKSBtZXRob2Q6XG4gKiAtIGZpcnN0IGNvbW1pdDogaHR0cHM6Ly9naXRodWIuY29tL3NvY2tldGlvL3NvY2tldC5pby1jbGllbnQvY29tbWl0LzRlZTFkNWQ5NGIzOTA2YTljMDUyYjQ1OWYxYTgxOGIxNWYzOGY5MWNcbiAqIC0gZXhwb3J0IGludG8gaXRzIG93biBtb2R1bGU6IGh0dHBzOi8vZ2l0aHViLmNvbS9zb2NrZXRpby9lbmdpbmUuaW8tY2xpZW50L2NvbW1pdC9kZTJjNTYxZTQ1NjRlZmViNzhmMWJkYjFiYTM5ZWY4MWIyODIyY2IzXG4gKiAtIHJlaW1wb3J0OiBodHRwczovL2dpdGh1Yi5jb20vc29ja2V0aW8vZW5naW5lLmlvLWNsaWVudC9jb21taXQvZGYzMjI3N2MzZjZkNjIyZWVjNWVkMDlmNDkzY2FlM2YzMzkxZDI0MlxuICpcbiAqIEBhdXRob3IgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+IChNSVQgbGljZW5zZSlcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5jb25zdCByZSA9IC9eKD86KD8hW146QFxcLz8jXSs6W146QFxcL10qQCkoaHR0cHxodHRwc3x3c3x3c3MpOlxcL1xcLyk/KCg/OigoW146QFxcLz8jXSopKD86OihbXjpAXFwvPyNdKikpPyk/QCk/KCg/OlthLWYwLTldezAsNH06KXsyLDd9W2EtZjAtOV17MCw0fXxbXjpcXC8/I10qKSg/OjooXFxkKikpPykoKChcXC8oPzpbXj8jXSg/IVtePyNcXC9dKlxcLltePyNcXC8uXSsoPzpbPyNdfCQpKSkqXFwvPyk/KFtePyNcXC9dKikpKD86XFw/KFteI10qKSk/KD86IyguKikpPykvO1xuY29uc3QgcGFydHMgPSBbXG4gICAgJ3NvdXJjZScsICdwcm90b2NvbCcsICdhdXRob3JpdHknLCAndXNlckluZm8nLCAndXNlcicsICdwYXNzd29yZCcsICdob3N0JywgJ3BvcnQnLCAncmVsYXRpdmUnLCAncGF0aCcsICdkaXJlY3RvcnknLCAnZmlsZScsICdxdWVyeScsICdhbmNob3InXG5dO1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICAgIGNvbnN0IHNyYyA9IHN0ciwgYiA9IHN0ci5pbmRleE9mKCdbJyksIGUgPSBzdHIuaW5kZXhPZignXScpO1xuICAgIGlmIChiICE9IC0xICYmIGUgIT0gLTEpIHtcbiAgICAgICAgc3RyID0gc3RyLnN1YnN0cmluZygwLCBiKSArIHN0ci5zdWJzdHJpbmcoYiwgZSkucmVwbGFjZSgvOi9nLCAnOycpICsgc3RyLnN1YnN0cmluZyhlLCBzdHIubGVuZ3RoKTtcbiAgICB9XG4gICAgbGV0IG0gPSByZS5leGVjKHN0ciB8fCAnJyksIHVyaSA9IHt9LCBpID0gMTQ7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB1cmlbcGFydHNbaV1dID0gbVtpXSB8fCAnJztcbiAgICB9XG4gICAgaWYgKGIgIT0gLTEgJiYgZSAhPSAtMSkge1xuICAgICAgICB1cmkuc291cmNlID0gc3JjO1xuICAgICAgICB1cmkuaG9zdCA9IHVyaS5ob3N0LnN1YnN0cmluZygxLCB1cmkuaG9zdC5sZW5ndGggLSAxKS5yZXBsYWNlKC87L2csICc6Jyk7XG4gICAgICAgIHVyaS5hdXRob3JpdHkgPSB1cmkuYXV0aG9yaXR5LnJlcGxhY2UoJ1snLCAnJykucmVwbGFjZSgnXScsICcnKS5yZXBsYWNlKC87L2csICc6Jyk7XG4gICAgICAgIHVyaS5pcHY2dXJpID0gdHJ1ZTtcbiAgICB9XG4gICAgdXJpLnBhdGhOYW1lcyA9IHBhdGhOYW1lcyh1cmksIHVyaVsncGF0aCddKTtcbiAgICB1cmkucXVlcnlLZXkgPSBxdWVyeUtleSh1cmksIHVyaVsncXVlcnknXSk7XG4gICAgcmV0dXJuIHVyaTtcbn1cbmZ1bmN0aW9uIHBhdGhOYW1lcyhvYmosIHBhdGgpIHtcbiAgICBjb25zdCByZWd4ID0gL1xcL3syLDl9L2csIG5hbWVzID0gcGF0aC5yZXBsYWNlKHJlZ3gsIFwiL1wiKS5zcGxpdChcIi9cIik7XG4gICAgaWYgKHBhdGguc2xpY2UoMCwgMSkgPT0gJy8nIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIG5hbWVzLnNwbGljZSgwLCAxKTtcbiAgICB9XG4gICAgaWYgKHBhdGguc2xpY2UoLTEpID09ICcvJykge1xuICAgICAgICBuYW1lcy5zcGxpY2UobmFtZXMubGVuZ3RoIC0gMSwgMSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcztcbn1cbmZ1bmN0aW9uIHF1ZXJ5S2V5KHVyaSwgcXVlcnkpIHtcbiAgICBjb25zdCBkYXRhID0ge307XG4gICAgcXVlcnkucmVwbGFjZSgvKD86XnwmKShbXiY9XSopPT8oW14mXSopL2csIGZ1bmN0aW9uICgkMCwgJDEsICQyKSB7XG4gICAgICAgIGlmICgkMSkge1xuICAgICAgICAgICAgZGF0YVskMV0gPSAkMjtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBkYXRhO1xufVxuIiwiaW1wb3J0IHsgdHJhbnNwb3J0cyB9IGZyb20gXCIuL3RyYW5zcG9ydHMvaW5kZXguanNcIjtcbmltcG9ydCB7IGluc3RhbGxUaW1lckZ1bmN0aW9ucywgYnl0ZUxlbmd0aCB9IGZyb20gXCIuL3V0aWwuanNcIjtcbmltcG9ydCB7IGRlY29kZSB9IGZyb20gXCIuL2NvbnRyaWIvcGFyc2Vxcy5qc1wiO1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tIFwiLi9jb250cmliL3BhcnNldXJpLmpzXCI7XG5pbXBvcnQgeyBFbWl0dGVyIH0gZnJvbSBcIkBzb2NrZXQuaW8vY29tcG9uZW50LWVtaXR0ZXJcIjtcbmltcG9ydCB7IHByb3RvY29sIH0gZnJvbSBcImVuZ2luZS5pby1wYXJzZXJcIjtcbmV4cG9ydCBjbGFzcyBTb2NrZXQgZXh0ZW5kcyBFbWl0dGVyIHtcbiAgICAvKipcbiAgICAgKiBTb2NrZXQgY29uc3RydWN0b3IuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHVyaSAtIHVyaSBvciBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgLSBvcHRpb25zXG4gICAgICovXG4gICAgY29uc3RydWN0b3IodXJpLCBvcHRzID0ge30pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy53cml0ZUJ1ZmZlciA9IFtdO1xuICAgICAgICBpZiAodXJpICYmIFwib2JqZWN0XCIgPT09IHR5cGVvZiB1cmkpIHtcbiAgICAgICAgICAgIG9wdHMgPSB1cmk7XG4gICAgICAgICAgICB1cmkgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cmkpIHtcbiAgICAgICAgICAgIHVyaSA9IHBhcnNlKHVyaSk7XG4gICAgICAgICAgICBvcHRzLmhvc3RuYW1lID0gdXJpLmhvc3Q7XG4gICAgICAgICAgICBvcHRzLnNlY3VyZSA9IHVyaS5wcm90b2NvbCA9PT0gXCJodHRwc1wiIHx8IHVyaS5wcm90b2NvbCA9PT0gXCJ3c3NcIjtcbiAgICAgICAgICAgIG9wdHMucG9ydCA9IHVyaS5wb3J0O1xuICAgICAgICAgICAgaWYgKHVyaS5xdWVyeSlcbiAgICAgICAgICAgICAgICBvcHRzLnF1ZXJ5ID0gdXJpLnF1ZXJ5O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG9wdHMuaG9zdCkge1xuICAgICAgICAgICAgb3B0cy5ob3N0bmFtZSA9IHBhcnNlKG9wdHMuaG9zdCkuaG9zdDtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YWxsVGltZXJGdW5jdGlvbnModGhpcywgb3B0cyk7XG4gICAgICAgIHRoaXMuc2VjdXJlID1cbiAgICAgICAgICAgIG51bGwgIT0gb3B0cy5zZWN1cmVcbiAgICAgICAgICAgICAgICA/IG9wdHMuc2VjdXJlXG4gICAgICAgICAgICAgICAgOiB0eXBlb2YgbG9jYXRpb24gIT09IFwidW5kZWZpbmVkXCIgJiYgXCJodHRwczpcIiA9PT0gbG9jYXRpb24ucHJvdG9jb2w7XG4gICAgICAgIGlmIChvcHRzLmhvc3RuYW1lICYmICFvcHRzLnBvcnQpIHtcbiAgICAgICAgICAgIC8vIGlmIG5vIHBvcnQgaXMgc3BlY2lmaWVkIG1hbnVhbGx5LCB1c2UgdGhlIHByb3RvY29sIGRlZmF1bHRcbiAgICAgICAgICAgIG9wdHMucG9ydCA9IHRoaXMuc2VjdXJlID8gXCI0NDNcIiA6IFwiODBcIjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhvc3RuYW1lID1cbiAgICAgICAgICAgIG9wdHMuaG9zdG5hbWUgfHxcbiAgICAgICAgICAgICAgICAodHlwZW9mIGxvY2F0aW9uICE9PSBcInVuZGVmaW5lZFwiID8gbG9jYXRpb24uaG9zdG5hbWUgOiBcImxvY2FsaG9zdFwiKTtcbiAgICAgICAgdGhpcy5wb3J0ID1cbiAgICAgICAgICAgIG9wdHMucG9ydCB8fFxuICAgICAgICAgICAgICAgICh0eXBlb2YgbG9jYXRpb24gIT09IFwidW5kZWZpbmVkXCIgJiYgbG9jYXRpb24ucG9ydFxuICAgICAgICAgICAgICAgICAgICA/IGxvY2F0aW9uLnBvcnRcbiAgICAgICAgICAgICAgICAgICAgOiB0aGlzLnNlY3VyZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBcIjQ0M1wiXG4gICAgICAgICAgICAgICAgICAgICAgICA6IFwiODBcIik7XG4gICAgICAgIHRoaXMudHJhbnNwb3J0cyA9IG9wdHMudHJhbnNwb3J0cyB8fCBbXCJwb2xsaW5nXCIsIFwid2Vic29ja2V0XCJdO1xuICAgICAgICB0aGlzLndyaXRlQnVmZmVyID0gW107XG4gICAgICAgIHRoaXMucHJldkJ1ZmZlckxlbiA9IDA7XG4gICAgICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgcGF0aDogXCIvZW5naW5lLmlvXCIsXG4gICAgICAgICAgICBhZ2VudDogZmFsc2UsXG4gICAgICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlLFxuICAgICAgICAgICAgdXBncmFkZTogdHJ1ZSxcbiAgICAgICAgICAgIHRpbWVzdGFtcFBhcmFtOiBcInRcIixcbiAgICAgICAgICAgIHJlbWVtYmVyVXBncmFkZTogZmFsc2UsXG4gICAgICAgICAgICBhZGRUcmFpbGluZ1NsYXNoOiB0cnVlLFxuICAgICAgICAgICAgcmVqZWN0VW5hdXRob3JpemVkOiB0cnVlLFxuICAgICAgICAgICAgcGVyTWVzc2FnZURlZmxhdGU6IHtcbiAgICAgICAgICAgICAgICB0aHJlc2hvbGQ6IDEwMjQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdHJhbnNwb3J0T3B0aW9uczoge30sXG4gICAgICAgICAgICBjbG9zZU9uQmVmb3JldW5sb2FkOiB0cnVlLFxuICAgICAgICB9LCBvcHRzKTtcbiAgICAgICAgdGhpcy5vcHRzLnBhdGggPVxuICAgICAgICAgICAgdGhpcy5vcHRzLnBhdGgucmVwbGFjZSgvXFwvJC8sIFwiXCIpICtcbiAgICAgICAgICAgICAgICAodGhpcy5vcHRzLmFkZFRyYWlsaW5nU2xhc2ggPyBcIi9cIiA6IFwiXCIpO1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMub3B0cy5xdWVyeSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdGhpcy5vcHRzLnF1ZXJ5ID0gZGVjb2RlKHRoaXMub3B0cy5xdWVyeSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2V0IG9uIGhhbmRzaGFrZVxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51cGdyYWRlcyA9IG51bGw7XG4gICAgICAgIHRoaXMucGluZ0ludGVydmFsID0gbnVsbDtcbiAgICAgICAgdGhpcy5waW5nVGltZW91dCA9IG51bGw7XG4gICAgICAgIC8vIHNldCBvbiBoZWFydGJlYXRcbiAgICAgICAgdGhpcy5waW5nVGltZW91dFRpbWVyID0gbnVsbDtcbiAgICAgICAgaWYgKHR5cGVvZiBhZGRFdmVudExpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuY2xvc2VPbkJlZm9yZXVubG9hZCkge1xuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggY2xvc2VzIHRoZSBjb25uZWN0aW9uIHdoZW4gdGhlIFwiYmVmb3JldW5sb2FkXCIgZXZlbnQgaXMgZW1pdHRlZCBidXQgbm90IENocm9tZS4gVGhpcyBldmVudCBsaXN0ZW5lclxuICAgICAgICAgICAgICAgIC8vIGVuc3VyZXMgZXZlcnkgYnJvd3NlciBiZWhhdmVzIHRoZSBzYW1lIChubyBcImRpc2Nvbm5lY3RcIiBldmVudCBhdCB0aGUgU29ja2V0LklPIGxldmVsIHdoZW4gdGhlIHBhZ2UgaXNcbiAgICAgICAgICAgICAgICAvLyBjbG9zZWQvcmVsb2FkZWQpXG4gICAgICAgICAgICAgICAgdGhpcy5iZWZvcmV1bmxvYWRFdmVudExpc3RlbmVyID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cmFuc3BvcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbGVudGx5IGNsb3NlIHRoZSB0cmFuc3BvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0LnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCB0aGlzLmJlZm9yZXVubG9hZEV2ZW50TGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmhvc3RuYW1lICE9PSBcImxvY2FsaG9zdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmZsaW5lRXZlbnRMaXN0ZW5lciA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkNsb3NlKFwidHJhbnNwb3J0IGNsb3NlXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIm5ldHdvcmsgY29ubmVjdGlvbiBsb3N0XCIsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcihcIm9mZmxpbmVcIiwgdGhpcy5vZmZsaW5lRXZlbnRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIHRyYW5zcG9ydCBvZiB0aGUgZ2l2ZW4gdHlwZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIC0gdHJhbnNwb3J0IG5hbWVcbiAgICAgKiBAcmV0dXJuIHtUcmFuc3BvcnR9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBjcmVhdGVUcmFuc3BvcnQobmFtZSkge1xuICAgICAgICBjb25zdCBxdWVyeSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMub3B0cy5xdWVyeSk7XG4gICAgICAgIC8vIGFwcGVuZCBlbmdpbmUuaW8gcHJvdG9jb2wgaWRlbnRpZmllclxuICAgICAgICBxdWVyeS5FSU8gPSBwcm90b2NvbDtcbiAgICAgICAgLy8gdHJhbnNwb3J0IG5hbWVcbiAgICAgICAgcXVlcnkudHJhbnNwb3J0ID0gbmFtZTtcbiAgICAgICAgLy8gc2Vzc2lvbiBpZCBpZiB3ZSBhbHJlYWR5IGhhdmUgb25lXG4gICAgICAgIGlmICh0aGlzLmlkKVxuICAgICAgICAgICAgcXVlcnkuc2lkID0gdGhpcy5pZDtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMub3B0cy50cmFuc3BvcnRPcHRpb25zW25hbWVdLCB0aGlzLm9wdHMsIHtcbiAgICAgICAgICAgIHF1ZXJ5LFxuICAgICAgICAgICAgc29ja2V0OiB0aGlzLFxuICAgICAgICAgICAgaG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG4gICAgICAgICAgICBzZWN1cmU6IHRoaXMuc2VjdXJlLFxuICAgICAgICAgICAgcG9ydDogdGhpcy5wb3J0LFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyB0cmFuc3BvcnRzW25hbWVdKG9wdHMpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0cmFuc3BvcnQgdG8gdXNlIGFuZCBzdGFydHMgcHJvYmUuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9wZW4oKSB7XG4gICAgICAgIGxldCB0cmFuc3BvcnQ7XG4gICAgICAgIGlmICh0aGlzLm9wdHMucmVtZW1iZXJVcGdyYWRlICYmXG4gICAgICAgICAgICBTb2NrZXQucHJpb3JXZWJzb2NrZXRTdWNjZXNzICYmXG4gICAgICAgICAgICB0aGlzLnRyYW5zcG9ydHMuaW5kZXhPZihcIndlYnNvY2tldFwiKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydCA9IFwid2Vic29ja2V0XCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoMCA9PT0gdGhpcy50cmFuc3BvcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gRW1pdCBlcnJvciBvbiBuZXh0IHRpY2sgc28gaXQgY2FuIGJlIGxpc3RlbmVkIHRvXG4gICAgICAgICAgICB0aGlzLnNldFRpbWVvdXRGbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJlcnJvclwiLCBcIk5vIHRyYW5zcG9ydHMgYXZhaWxhYmxlXCIpO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0cmFuc3BvcnQgPSB0aGlzLnRyYW5zcG9ydHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gXCJvcGVuaW5nXCI7XG4gICAgICAgIC8vIFJldHJ5IHdpdGggdGhlIG5leHQgdHJhbnNwb3J0IGlmIHRoZSB0cmFuc3BvcnQgaXMgZGlzYWJsZWQgKGpzb25wOiBmYWxzZSlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRyYW5zcG9ydCA9IHRoaXMuY3JlYXRlVHJhbnNwb3J0KHRyYW5zcG9ydCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0cy5zaGlmdCgpO1xuICAgICAgICAgICAgdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdHJhbnNwb3J0Lm9wZW4oKTtcbiAgICAgICAgdGhpcy5zZXRUcmFuc3BvcnQodHJhbnNwb3J0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCB0cmFuc3BvcnQuIERpc2FibGVzIHRoZSBleGlzdGluZyBvbmUgKGlmIGFueSkuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHNldFRyYW5zcG9ydCh0cmFuc3BvcnQpIHtcbiAgICAgICAgaWYgKHRoaXMudHJhbnNwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLnRyYW5zcG9ydC5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZXQgdXAgdHJhbnNwb3J0XG4gICAgICAgIHRoaXMudHJhbnNwb3J0ID0gdHJhbnNwb3J0O1xuICAgICAgICAvLyBzZXQgdXAgdHJhbnNwb3J0IGxpc3RlbmVyc1xuICAgICAgICB0cmFuc3BvcnRcbiAgICAgICAgICAgIC5vbihcImRyYWluXCIsIHRoaXMub25EcmFpbi5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgLm9uKFwicGFja2V0XCIsIHRoaXMub25QYWNrZXQuYmluZCh0aGlzKSlcbiAgICAgICAgICAgIC5vbihcImVycm9yXCIsIHRoaXMub25FcnJvci5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgLm9uKFwiY2xvc2VcIiwgKHJlYXNvbikgPT4gdGhpcy5vbkNsb3NlKFwidHJhbnNwb3J0IGNsb3NlXCIsIHJlYXNvbikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9iZXMgYSB0cmFuc3BvcnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIHRyYW5zcG9ydCBuYW1lXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBwcm9iZShuYW1lKSB7XG4gICAgICAgIGxldCB0cmFuc3BvcnQgPSB0aGlzLmNyZWF0ZVRyYW5zcG9ydChuYW1lKTtcbiAgICAgICAgbGV0IGZhaWxlZCA9IGZhbHNlO1xuICAgICAgICBTb2NrZXQucHJpb3JXZWJzb2NrZXRTdWNjZXNzID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IG9uVHJhbnNwb3J0T3BlbiA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChmYWlsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdHJhbnNwb3J0LnNlbmQoW3sgdHlwZTogXCJwaW5nXCIsIGRhdGE6IFwicHJvYmVcIiB9XSk7XG4gICAgICAgICAgICB0cmFuc3BvcnQub25jZShcInBhY2tldFwiLCAobXNnKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZhaWxlZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmIChcInBvbmdcIiA9PT0gbXNnLnR5cGUgJiYgXCJwcm9iZVwiID09PSBtc2cuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZ3JhZGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwidXBncmFkaW5nXCIsIHRyYW5zcG9ydCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdHJhbnNwb3J0KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICBTb2NrZXQucHJpb3JXZWJzb2NrZXRTdWNjZXNzID0gXCJ3ZWJzb2NrZXRcIiA9PT0gdHJhbnNwb3J0Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0LnBhdXNlKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWlsZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFwiY2xvc2VkXCIgPT09IHRoaXMucmVhZHlTdGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFRyYW5zcG9ydCh0cmFuc3BvcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNwb3J0LnNlbmQoW3sgdHlwZTogXCJ1cGdyYWRlXCIgfV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJ1cGdyYWRlXCIsIHRyYW5zcG9ydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc3BvcnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGdyYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmx1c2goKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IoXCJwcm9iZSBlcnJvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgICAgICBlcnIudHJhbnNwb3J0ID0gdHJhbnNwb3J0Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwidXBncmFkZUVycm9yXCIsIGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGZ1bmN0aW9uIGZyZWV6ZVRyYW5zcG9ydCgpIHtcbiAgICAgICAgICAgIGlmIChmYWlsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgLy8gQW55IGNhbGxiYWNrIGNhbGxlZCBieSB0cmFuc3BvcnQgc2hvdWxkIGJlIGlnbm9yZWQgc2luY2Ugbm93XG4gICAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgdHJhbnNwb3J0LmNsb3NlKCk7XG4gICAgICAgICAgICB0cmFuc3BvcnQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIC8vIEhhbmRsZSBhbnkgZXJyb3IgdGhhdCBoYXBwZW5zIHdoaWxlIHByb2JpbmdcbiAgICAgICAgY29uc3Qgb25lcnJvciA9IChlcnIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFwicHJvYmUgZXJyb3I6IFwiICsgZXJyKTtcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIGVycm9yLnRyYW5zcG9ydCA9IHRyYW5zcG9ydC5uYW1lO1xuICAgICAgICAgICAgZnJlZXplVHJhbnNwb3J0KCk7XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcInVwZ3JhZGVFcnJvclwiLCBlcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIGZ1bmN0aW9uIG9uVHJhbnNwb3J0Q2xvc2UoKSB7XG4gICAgICAgICAgICBvbmVycm9yKFwidHJhbnNwb3J0IGNsb3NlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXaGVuIHRoZSBzb2NrZXQgaXMgY2xvc2VkIHdoaWxlIHdlJ3JlIHByb2JpbmdcbiAgICAgICAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICAgICAgICAgIG9uZXJyb3IoXCJzb2NrZXQgY2xvc2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdoZW4gdGhlIHNvY2tldCBpcyB1cGdyYWRlZCB3aGlsZSB3ZSdyZSBwcm9iaW5nXG4gICAgICAgIGZ1bmN0aW9uIG9udXBncmFkZSh0bykge1xuICAgICAgICAgICAgaWYgKHRyYW5zcG9ydCAmJiB0by5uYW1lICE9PSB0cmFuc3BvcnQubmFtZSkge1xuICAgICAgICAgICAgICAgIGZyZWV6ZVRyYW5zcG9ydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFJlbW92ZSBhbGwgbGlzdGVuZXJzIG9uIHRoZSB0cmFuc3BvcnQgYW5kIG9uIHNlbGZcbiAgICAgICAgY29uc3QgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5yZW1vdmVMaXN0ZW5lcihcIm9wZW5cIiwgb25UcmFuc3BvcnRPcGVuKTtcbiAgICAgICAgICAgIHRyYW5zcG9ydC5yZW1vdmVMaXN0ZW5lcihcImVycm9yXCIsIG9uZXJyb3IpO1xuICAgICAgICAgICAgdHJhbnNwb3J0LnJlbW92ZUxpc3RlbmVyKFwiY2xvc2VcIiwgb25UcmFuc3BvcnRDbG9zZSk7XG4gICAgICAgICAgICB0aGlzLm9mZihcImNsb3NlXCIsIG9uY2xvc2UpO1xuICAgICAgICAgICAgdGhpcy5vZmYoXCJ1cGdyYWRpbmdcIiwgb251cGdyYWRlKTtcbiAgICAgICAgfTtcbiAgICAgICAgdHJhbnNwb3J0Lm9uY2UoXCJvcGVuXCIsIG9uVHJhbnNwb3J0T3Blbik7XG4gICAgICAgIHRyYW5zcG9ydC5vbmNlKFwiZXJyb3JcIiwgb25lcnJvcik7XG4gICAgICAgIHRyYW5zcG9ydC5vbmNlKFwiY2xvc2VcIiwgb25UcmFuc3BvcnRDbG9zZSk7XG4gICAgICAgIHRoaXMub25jZShcImNsb3NlXCIsIG9uY2xvc2UpO1xuICAgICAgICB0aGlzLm9uY2UoXCJ1cGdyYWRpbmdcIiwgb251cGdyYWRlKTtcbiAgICAgICAgdHJhbnNwb3J0Lm9wZW4oKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gY29ubmVjdGlvbiBpcyBkZWVtZWQgb3Blbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25PcGVuKCkge1xuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBcIm9wZW5cIjtcbiAgICAgICAgU29ja2V0LnByaW9yV2Vic29ja2V0U3VjY2VzcyA9IFwid2Vic29ja2V0XCIgPT09IHRoaXMudHJhbnNwb3J0Lm5hbWU7XG4gICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwib3BlblwiKTtcbiAgICAgICAgdGhpcy5mbHVzaCgpO1xuICAgICAgICAvLyB3ZSBjaGVjayBmb3IgYHJlYWR5U3RhdGVgIGluIGNhc2UgYW4gYG9wZW5gXG4gICAgICAgIC8vIGxpc3RlbmVyIGFscmVhZHkgY2xvc2VkIHRoZSBzb2NrZXRcbiAgICAgICAgaWYgKFwib3BlblwiID09PSB0aGlzLnJlYWR5U3RhdGUgJiYgdGhpcy5vcHRzLnVwZ3JhZGUpIHtcbiAgICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICAgIGNvbnN0IGwgPSB0aGlzLnVwZ3JhZGVzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9iZSh0aGlzLnVwZ3JhZGVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGEgcGFja2V0LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvblBhY2tldChwYWNrZXQpIHtcbiAgICAgICAgaWYgKFwib3BlbmluZ1wiID09PSB0aGlzLnJlYWR5U3RhdGUgfHxcbiAgICAgICAgICAgIFwib3BlblwiID09PSB0aGlzLnJlYWR5U3RhdGUgfHxcbiAgICAgICAgICAgIFwiY2xvc2luZ1wiID09PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicGFja2V0XCIsIHBhY2tldCk7XG4gICAgICAgICAgICAvLyBTb2NrZXQgaXMgbGl2ZSAtIGFueSBwYWNrZXQgY291bnRzXG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImhlYXJ0YmVhdFwiKTtcbiAgICAgICAgICAgIHN3aXRjaCAocGFja2V0LnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwib3BlblwiOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uSGFuZHNoYWtlKEpTT04ucGFyc2UocGFja2V0LmRhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInBpbmdcIjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFBpbmdUaW1lb3V0KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZFBhY2tldChcInBvbmdcIik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicGluZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJwb25nXCIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZXJyb3JcIjpcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKFwic2VydmVyIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgICAgICAgIGVyci5jb2RlID0gcGFja2V0LmRhdGE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwibWVzc2FnZVwiOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImRhdGFcIiwgcGFja2V0LmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcIm1lc3NhZ2VcIiwgcGFja2V0LmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBoYW5kc2hha2UgY29tcGxldGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gaGFuZHNoYWtlIG9ialxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25IYW5kc2hha2UoZGF0YSkge1xuICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImhhbmRzaGFrZVwiLCBkYXRhKTtcbiAgICAgICAgdGhpcy5pZCA9IGRhdGEuc2lkO1xuICAgICAgICB0aGlzLnRyYW5zcG9ydC5xdWVyeS5zaWQgPSBkYXRhLnNpZDtcbiAgICAgICAgdGhpcy51cGdyYWRlcyA9IHRoaXMuZmlsdGVyVXBncmFkZXMoZGF0YS51cGdyYWRlcyk7XG4gICAgICAgIHRoaXMucGluZ0ludGVydmFsID0gZGF0YS5waW5nSW50ZXJ2YWw7XG4gICAgICAgIHRoaXMucGluZ1RpbWVvdXQgPSBkYXRhLnBpbmdUaW1lb3V0O1xuICAgICAgICB0aGlzLm1heFBheWxvYWQgPSBkYXRhLm1heFBheWxvYWQ7XG4gICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgIC8vIEluIGNhc2Ugb3BlbiBoYW5kbGVyIGNsb3NlcyBzb2NrZXRcbiAgICAgICAgaWYgKFwiY2xvc2VkXCIgPT09IHRoaXMucmVhZHlTdGF0ZSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdGhpcy5yZXNldFBpbmdUaW1lb3V0KCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgYW5kIHJlc2V0cyBwaW5nIHRpbWVvdXQgdGltZXIgYmFzZWQgb24gc2VydmVyIHBpbmdzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICByZXNldFBpbmdUaW1lb3V0KCkge1xuICAgICAgICB0aGlzLmNsZWFyVGltZW91dEZuKHRoaXMucGluZ1RpbWVvdXRUaW1lcik7XG4gICAgICAgIHRoaXMucGluZ1RpbWVvdXRUaW1lciA9IHRoaXMuc2V0VGltZW91dEZuKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25DbG9zZShcInBpbmcgdGltZW91dFwiKTtcbiAgICAgICAgfSwgdGhpcy5waW5nSW50ZXJ2YWwgKyB0aGlzLnBpbmdUaW1lb3V0KTtcbiAgICAgICAgaWYgKHRoaXMub3B0cy5hdXRvVW5yZWYpIHtcbiAgICAgICAgICAgIHRoaXMucGluZ1RpbWVvdXRUaW1lci51bnJlZigpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCBvbiBgZHJhaW5gIGV2ZW50XG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uRHJhaW4oKSB7XG4gICAgICAgIHRoaXMud3JpdGVCdWZmZXIuc3BsaWNlKDAsIHRoaXMucHJldkJ1ZmZlckxlbik7XG4gICAgICAgIC8vIHNldHRpbmcgcHJldkJ1ZmZlckxlbiA9IDAgaXMgdmVyeSBpbXBvcnRhbnRcbiAgICAgICAgLy8gZm9yIGV4YW1wbGUsIHdoZW4gdXBncmFkaW5nLCB1cGdyYWRlIHBhY2tldCBpcyBzZW50IG92ZXIsXG4gICAgICAgIC8vIGFuZCBhIG5vbnplcm8gcHJldkJ1ZmZlckxlbiBjb3VsZCBjYXVzZSBwcm9ibGVtcyBvbiBgZHJhaW5gXG4gICAgICAgIHRoaXMucHJldkJ1ZmZlckxlbiA9IDA7XG4gICAgICAgIGlmICgwID09PSB0aGlzLndyaXRlQnVmZmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJkcmFpblwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZmx1c2goKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBGbHVzaCB3cml0ZSBidWZmZXJzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmbHVzaCgpIHtcbiAgICAgICAgaWYgKFwiY2xvc2VkXCIgIT09IHRoaXMucmVhZHlTdGF0ZSAmJlxuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQud3JpdGFibGUgJiZcbiAgICAgICAgICAgICF0aGlzLnVwZ3JhZGluZyAmJlxuICAgICAgICAgICAgdGhpcy53cml0ZUJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldHMgPSB0aGlzLmdldFdyaXRhYmxlUGFja2V0cygpO1xuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQuc2VuZChwYWNrZXRzKTtcbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgY3VycmVudCBsZW5ndGggb2Ygd3JpdGVCdWZmZXJcbiAgICAgICAgICAgIC8vIHNwbGljZSB3cml0ZUJ1ZmZlciBhbmQgY2FsbGJhY2tCdWZmZXIgb24gYGRyYWluYFxuICAgICAgICAgICAgdGhpcy5wcmV2QnVmZmVyTGVuID0gcGFja2V0cy5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImZsdXNoXCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGUgZW5jb2RlZCBzaXplIG9mIHRoZSB3cml0ZUJ1ZmZlciBpcyBiZWxvdyB0aGUgbWF4UGF5bG9hZCB2YWx1ZSBzZW50IGJ5IHRoZSBzZXJ2ZXIgKG9ubHkgZm9yIEhUVFBcbiAgICAgKiBsb25nLXBvbGxpbmcpXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGdldFdyaXRhYmxlUGFja2V0cygpIHtcbiAgICAgICAgY29uc3Qgc2hvdWxkQ2hlY2tQYXlsb2FkU2l6ZSA9IHRoaXMubWF4UGF5bG9hZCAmJlxuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQubmFtZSA9PT0gXCJwb2xsaW5nXCIgJiZcbiAgICAgICAgICAgIHRoaXMud3JpdGVCdWZmZXIubGVuZ3RoID4gMTtcbiAgICAgICAgaWYgKCFzaG91bGRDaGVja1BheWxvYWRTaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy53cml0ZUJ1ZmZlcjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcGF5bG9hZFNpemUgPSAxOyAvLyBmaXJzdCBwYWNrZXQgdHlwZVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMud3JpdGVCdWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLndyaXRlQnVmZmVyW2ldLmRhdGE7XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHBheWxvYWRTaXplICs9IGJ5dGVMZW5ndGgoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaSA+IDAgJiYgcGF5bG9hZFNpemUgPiB0aGlzLm1heFBheWxvYWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53cml0ZUJ1ZmZlci5zbGljZSgwLCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBheWxvYWRTaXplICs9IDI7IC8vIHNlcGFyYXRvciArIHBhY2tldCB0eXBlXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMud3JpdGVCdWZmZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNlbmRzIGEgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtc2cgLSBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEByZXR1cm4ge1NvY2tldH0gZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHdyaXRlKG1zZywgb3B0aW9ucywgZm4pIHtcbiAgICAgICAgdGhpcy5zZW5kUGFja2V0KFwibWVzc2FnZVwiLCBtc2csIG9wdGlvbnMsIGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHNlbmQobXNnLCBvcHRpb25zLCBmbikge1xuICAgICAgICB0aGlzLnNlbmRQYWNrZXQoXCJtZXNzYWdlXCIsIG1zZywgb3B0aW9ucywgZm4pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2VuZHMgYSBwYWNrZXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZTogcGFja2V0IHR5cGUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gLSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHNlbmRQYWNrZXQodHlwZSwgZGF0YSwgb3B0aW9ucywgZm4pIHtcbiAgICAgICAgaWYgKFwiZnVuY3Rpb25cIiA9PT0gdHlwZW9mIGRhdGEpIHtcbiAgICAgICAgICAgIGZuID0gZGF0YTtcbiAgICAgICAgICAgIGRhdGEgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFwiZnVuY3Rpb25cIiA9PT0gdHlwZW9mIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGZuID0gb3B0aW9ucztcbiAgICAgICAgICAgIG9wdGlvbnMgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcImNsb3NpbmdcIiA9PT0gdGhpcy5yZWFkeVN0YXRlIHx8IFwiY2xvc2VkXCIgPT09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBvcHRpb25zLmNvbXByZXNzID0gZmFsc2UgIT09IG9wdGlvbnMuY29tcHJlc3M7XG4gICAgICAgIGNvbnN0IHBhY2tldCA9IHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJwYWNrZXRDcmVhdGVcIiwgcGFja2V0KTtcbiAgICAgICAgdGhpcy53cml0ZUJ1ZmZlci5wdXNoKHBhY2tldCk7XG4gICAgICAgIGlmIChmbilcbiAgICAgICAgICAgIHRoaXMub25jZShcImZsdXNoXCIsIGZuKTtcbiAgICAgICAgdGhpcy5mbHVzaCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgdGhlIGNvbm5lY3Rpb24uXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGNvbnN0IGNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vbkNsb3NlKFwiZm9yY2VkIGNsb3NlXCIpO1xuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgY2xlYW51cEFuZENsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vZmYoXCJ1cGdyYWRlXCIsIGNsZWFudXBBbmRDbG9zZSk7XG4gICAgICAgICAgICB0aGlzLm9mZihcInVwZ3JhZGVFcnJvclwiLCBjbGVhbnVwQW5kQ2xvc2UpO1xuICAgICAgICAgICAgY2xvc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgd2FpdEZvclVwZ3JhZGUgPSAoKSA9PiB7XG4gICAgICAgICAgICAvLyB3YWl0IGZvciB1cGdyYWRlIHRvIGZpbmlzaCBzaW5jZSB3ZSBjYW4ndCBzZW5kIHBhY2tldHMgd2hpbGUgcGF1c2luZyBhIHRyYW5zcG9ydFxuICAgICAgICAgICAgdGhpcy5vbmNlKFwidXBncmFkZVwiLCBjbGVhbnVwQW5kQ2xvc2UpO1xuICAgICAgICAgICAgdGhpcy5vbmNlKFwidXBncmFkZUVycm9yXCIsIGNsZWFudXBBbmRDbG9zZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmIChcIm9wZW5pbmdcIiA9PT0gdGhpcy5yZWFkeVN0YXRlIHx8IFwib3BlblwiID09PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFwiY2xvc2luZ1wiO1xuICAgICAgICAgICAgaWYgKHRoaXMud3JpdGVCdWZmZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbmNlKFwiZHJhaW5cIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cGdyYWRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JVcGdyYWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0aGlzLnVwZ3JhZGluZykge1xuICAgICAgICAgICAgICAgIHdhaXRGb3JVcGdyYWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiB0cmFuc3BvcnQgZXJyb3JcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25FcnJvcihlcnIpIHtcbiAgICAgICAgU29ja2V0LnByaW9yV2Vic29ja2V0U3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImVycm9yXCIsIGVycik7XG4gICAgICAgIHRoaXMub25DbG9zZShcInRyYW5zcG9ydCBlcnJvclwiLCBlcnIpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiB0cmFuc3BvcnQgY2xvc2UuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uQ2xvc2UocmVhc29uLCBkZXNjcmlwdGlvbikge1xuICAgICAgICBpZiAoXCJvcGVuaW5nXCIgPT09IHRoaXMucmVhZHlTdGF0ZSB8fFxuICAgICAgICAgICAgXCJvcGVuXCIgPT09IHRoaXMucmVhZHlTdGF0ZSB8fFxuICAgICAgICAgICAgXCJjbG9zaW5nXCIgPT09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgLy8gY2xlYXIgdGltZXJzXG4gICAgICAgICAgICB0aGlzLmNsZWFyVGltZW91dEZuKHRoaXMucGluZ1RpbWVvdXRUaW1lcik7XG4gICAgICAgICAgICAvLyBzdG9wIGV2ZW50IGZyb20gZmlyaW5nIGFnYWluIGZvciB0cmFuc3BvcnRcbiAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0LnJlbW92ZUFsbExpc3RlbmVycyhcImNsb3NlXCIpO1xuICAgICAgICAgICAgLy8gZW5zdXJlIHRyYW5zcG9ydCB3b24ndCBzdGF5IG9wZW5cbiAgICAgICAgICAgIHRoaXMudHJhbnNwb3J0LmNsb3NlKCk7XG4gICAgICAgICAgICAvLyBpZ25vcmUgZnVydGhlciB0cmFuc3BvcnQgY29tbXVuaWNhdGlvblxuICAgICAgICAgICAgdGhpcy50cmFuc3BvcnQucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlbW92ZUV2ZW50TGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgdGhpcy5iZWZvcmV1bmxvYWRFdmVudExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm9mZmxpbmVcIiwgdGhpcy5vZmZsaW5lRXZlbnRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2V0IHJlYWR5IHN0YXRlXG4gICAgICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBcImNsb3NlZFwiO1xuICAgICAgICAgICAgLy8gY2xlYXIgc2Vzc2lvbiBpZFxuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICAvLyBlbWl0IGNsb3NlIGV2ZW50XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImNsb3NlXCIsIHJlYXNvbiwgZGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgLy8gY2xlYW4gYnVmZmVycyBhZnRlciwgc28gdXNlcnMgY2FuIHN0aWxsXG4gICAgICAgICAgICAvLyBncmFiIHRoZSBidWZmZXJzIG9uIGBjbG9zZWAgZXZlbnRcbiAgICAgICAgICAgIHRoaXMud3JpdGVCdWZmZXIgPSBbXTtcbiAgICAgICAgICAgIHRoaXMucHJldkJ1ZmZlckxlbiA9IDA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRmlsdGVycyB1cGdyYWRlcywgcmV0dXJuaW5nIG9ubHkgdGhvc2UgbWF0Y2hpbmcgY2xpZW50IHRyYW5zcG9ydHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB1cGdyYWRlcyAtIHNlcnZlciB1cGdyYWRlc1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZmlsdGVyVXBncmFkZXModXBncmFkZXMpIHtcbiAgICAgICAgY29uc3QgZmlsdGVyZWRVcGdyYWRlcyA9IFtdO1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIGNvbnN0IGogPSB1cGdyYWRlcy5sZW5ndGg7XG4gICAgICAgIGZvciAoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgICBpZiAofnRoaXMudHJhbnNwb3J0cy5pbmRleE9mKHVwZ3JhZGVzW2ldKSlcbiAgICAgICAgICAgICAgICBmaWx0ZXJlZFVwZ3JhZGVzLnB1c2godXBncmFkZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZFVwZ3JhZGVzO1xuICAgIH1cbn1cblNvY2tldC5wcm90b2NvbCA9IHByb3RvY29sO1xuIiwiaW1wb3J0IHsgcGFyc2UgfSBmcm9tIFwiZW5naW5lLmlvLWNsaWVudFwiO1xuLyoqXG4gKiBVUkwgcGFyc2VyLlxuICpcbiAqIEBwYXJhbSB1cmkgLSB1cmxcbiAqIEBwYXJhbSBwYXRoIC0gdGhlIHJlcXVlc3QgcGF0aCBvZiB0aGUgY29ubmVjdGlvblxuICogQHBhcmFtIGxvYyAtIEFuIG9iamVjdCBtZWFudCB0byBtaW1pYyB3aW5kb3cubG9jYXRpb24uXG4gKiAgICAgICAgRGVmYXVsdHMgdG8gd2luZG93LmxvY2F0aW9uLlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgZnVuY3Rpb24gdXJsKHVyaSwgcGF0aCA9IFwiXCIsIGxvYykge1xuICAgIGxldCBvYmogPSB1cmk7XG4gICAgLy8gZGVmYXVsdCB0byB3aW5kb3cubG9jYXRpb25cbiAgICBsb2MgPSBsb2MgfHwgKHR5cGVvZiBsb2NhdGlvbiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBsb2NhdGlvbik7XG4gICAgaWYgKG51bGwgPT0gdXJpKVxuICAgICAgICB1cmkgPSBsb2MucHJvdG9jb2wgKyBcIi8vXCIgKyBsb2MuaG9zdDtcbiAgICAvLyByZWxhdGl2ZSBwYXRoIHN1cHBvcnRcbiAgICBpZiAodHlwZW9mIHVyaSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBpZiAoXCIvXCIgPT09IHVyaS5jaGFyQXQoMCkpIHtcbiAgICAgICAgICAgIGlmIChcIi9cIiA9PT0gdXJpLmNoYXJBdCgxKSkge1xuICAgICAgICAgICAgICAgIHVyaSA9IGxvYy5wcm90b2NvbCArIHVyaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHVyaSA9IGxvYy5ob3N0ICsgdXJpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghL14oaHR0cHM/fHdzcz8pOlxcL1xcLy8udGVzdCh1cmkpKSB7XG4gICAgICAgICAgICBpZiAoXCJ1bmRlZmluZWRcIiAhPT0gdHlwZW9mIGxvYykge1xuICAgICAgICAgICAgICAgIHVyaSA9IGxvYy5wcm90b2NvbCArIFwiLy9cIiArIHVyaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHVyaSA9IFwiaHR0cHM6Ly9cIiArIHVyaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBwYXJzZVxuICAgICAgICBvYmogPSBwYXJzZSh1cmkpO1xuICAgIH1cbiAgICAvLyBtYWtlIHN1cmUgd2UgdHJlYXQgYGxvY2FsaG9zdDo4MGAgYW5kIGBsb2NhbGhvc3RgIGVxdWFsbHlcbiAgICBpZiAoIW9iai5wb3J0KSB7XG4gICAgICAgIGlmICgvXihodHRwfHdzKSQvLnRlc3Qob2JqLnByb3RvY29sKSkge1xuICAgICAgICAgICAgb2JqLnBvcnQgPSBcIjgwXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL14oaHR0cHx3cylzJC8udGVzdChvYmoucHJvdG9jb2wpKSB7XG4gICAgICAgICAgICBvYmoucG9ydCA9IFwiNDQzXCI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgb2JqLnBhdGggPSBvYmoucGF0aCB8fCBcIi9cIjtcbiAgICBjb25zdCBpcHY2ID0gb2JqLmhvc3QuaW5kZXhPZihcIjpcIikgIT09IC0xO1xuICAgIGNvbnN0IGhvc3QgPSBpcHY2ID8gXCJbXCIgKyBvYmouaG9zdCArIFwiXVwiIDogb2JqLmhvc3Q7XG4gICAgLy8gZGVmaW5lIHVuaXF1ZSBpZFxuICAgIG9iai5pZCA9IG9iai5wcm90b2NvbCArIFwiOi8vXCIgKyBob3N0ICsgXCI6XCIgKyBvYmoucG9ydCArIHBhdGg7XG4gICAgLy8gZGVmaW5lIGhyZWZcbiAgICBvYmouaHJlZiA9XG4gICAgICAgIG9iai5wcm90b2NvbCArXG4gICAgICAgICAgICBcIjovL1wiICtcbiAgICAgICAgICAgIGhvc3QgK1xuICAgICAgICAgICAgKGxvYyAmJiBsb2MucG9ydCA9PT0gb2JqLnBvcnQgPyBcIlwiIDogXCI6XCIgKyBvYmoucG9ydCk7XG4gICAgcmV0dXJuIG9iajtcbn1cbiIsImNvbnN0IHdpdGhOYXRpdmVBcnJheUJ1ZmZlciA9IHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gXCJmdW5jdGlvblwiO1xuY29uc3QgaXNWaWV3ID0gKG9iaikgPT4ge1xuICAgIHJldHVybiB0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgPyBBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKVxuICAgICAgICA6IG9iai5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcjtcbn07XG5jb25zdCB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5jb25zdCB3aXRoTmF0aXZlQmxvYiA9IHR5cGVvZiBCbG9iID09PSBcImZ1bmN0aW9uXCIgfHxcbiAgICAodHlwZW9mIEJsb2IgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgdG9TdHJpbmcuY2FsbChCbG9iKSA9PT0gXCJbb2JqZWN0IEJsb2JDb25zdHJ1Y3Rvcl1cIik7XG5jb25zdCB3aXRoTmF0aXZlRmlsZSA9IHR5cGVvZiBGaWxlID09PSBcImZ1bmN0aW9uXCIgfHxcbiAgICAodHlwZW9mIEZpbGUgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgdG9TdHJpbmcuY2FsbChGaWxlKSA9PT0gXCJbb2JqZWN0IEZpbGVDb25zdHJ1Y3Rvcl1cIik7XG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBvYmogaXMgYSBCdWZmZXIsIGFuIEFycmF5QnVmZmVyLCBhIEJsb2Igb3IgYSBGaWxlLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JpbmFyeShvYmopIHtcbiAgICByZXR1cm4gKCh3aXRoTmF0aXZlQXJyYXlCdWZmZXIgJiYgKG9iaiBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IGlzVmlldyhvYmopKSkgfHxcbiAgICAgICAgKHdpdGhOYXRpdmVCbG9iICYmIG9iaiBpbnN0YW5jZW9mIEJsb2IpIHx8XG4gICAgICAgICh3aXRoTmF0aXZlRmlsZSAmJiBvYmogaW5zdGFuY2VvZiBGaWxlKSk7XG59XG5leHBvcnQgZnVuY3Rpb24gaGFzQmluYXJ5KG9iaiwgdG9KU09OKSB7XG4gICAgaWYgKCFvYmogfHwgdHlwZW9mIG9iaiAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaGFzQmluYXJ5KG9ialtpXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChpc0JpbmFyeShvYmopKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAob2JqLnRvSlNPTiAmJlxuICAgICAgICB0eXBlb2Ygb2JqLnRvSlNPTiA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgIGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGhhc0JpbmFyeShvYmoudG9KU09OKCksIHRydWUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkgJiYgaGFzQmluYXJ5KG9ialtrZXldKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuIiwiaW1wb3J0IHsgaXNCaW5hcnkgfSBmcm9tIFwiLi9pcy1iaW5hcnkuanNcIjtcbi8qKlxuICogUmVwbGFjZXMgZXZlcnkgQnVmZmVyIHwgQXJyYXlCdWZmZXIgfCBCbG9iIHwgRmlsZSBpbiBwYWNrZXQgd2l0aCBhIG51bWJlcmVkIHBsYWNlaG9sZGVyLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYWNrZXQgLSBzb2NrZXQuaW8gZXZlbnQgcGFja2V0XG4gKiBAcmV0dXJuIHtPYmplY3R9IHdpdGggZGVjb25zdHJ1Y3RlZCBwYWNrZXQgYW5kIGxpc3Qgb2YgYnVmZmVyc1xuICogQHB1YmxpY1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjb25zdHJ1Y3RQYWNrZXQocGFja2V0KSB7XG4gICAgY29uc3QgYnVmZmVycyA9IFtdO1xuICAgIGNvbnN0IHBhY2tldERhdGEgPSBwYWNrZXQuZGF0YTtcbiAgICBjb25zdCBwYWNrID0gcGFja2V0O1xuICAgIHBhY2suZGF0YSA9IF9kZWNvbnN0cnVjdFBhY2tldChwYWNrZXREYXRhLCBidWZmZXJzKTtcbiAgICBwYWNrLmF0dGFjaG1lbnRzID0gYnVmZmVycy5sZW5ndGg7IC8vIG51bWJlciBvZiBiaW5hcnkgJ2F0dGFjaG1lbnRzJ1xuICAgIHJldHVybiB7IHBhY2tldDogcGFjaywgYnVmZmVyczogYnVmZmVycyB9O1xufVxuZnVuY3Rpb24gX2RlY29uc3RydWN0UGFja2V0KGRhdGEsIGJ1ZmZlcnMpIHtcbiAgICBpZiAoIWRhdGEpXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIGlmIChpc0JpbmFyeShkYXRhKSkge1xuICAgICAgICBjb25zdCBwbGFjZWhvbGRlciA9IHsgX3BsYWNlaG9sZGVyOiB0cnVlLCBudW06IGJ1ZmZlcnMubGVuZ3RoIH07XG4gICAgICAgIGJ1ZmZlcnMucHVzaChkYXRhKTtcbiAgICAgICAgcmV0dXJuIHBsYWNlaG9sZGVyO1xuICAgIH1cbiAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSBuZXcgQXJyYXkoZGF0YS5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG5ld0RhdGFbaV0gPSBfZGVjb25zdHJ1Y3RQYWNrZXQoZGF0YVtpXSwgYnVmZmVycyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0RhdGE7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkYXRhID09PSBcIm9iamVjdFwiICYmICEoZGF0YSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChkYXRhLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgbmV3RGF0YVtrZXldID0gX2RlY29uc3RydWN0UGFja2V0KGRhdGFba2V5XSwgYnVmZmVycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0RhdGE7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufVxuLyoqXG4gKiBSZWNvbnN0cnVjdHMgYSBiaW5hcnkgcGFja2V0IGZyb20gaXRzIHBsYWNlaG9sZGVyIHBhY2tldCBhbmQgYnVmZmVyc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYWNrZXQgLSBldmVudCBwYWNrZXQgd2l0aCBwbGFjZWhvbGRlcnNcbiAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlcnMgLSBiaW5hcnkgYnVmZmVycyB0byBwdXQgaW4gcGxhY2Vob2xkZXIgcG9zaXRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IHJlY29uc3RydWN0ZWQgcGFja2V0XG4gKiBAcHVibGljXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWNvbnN0cnVjdFBhY2tldChwYWNrZXQsIGJ1ZmZlcnMpIHtcbiAgICBwYWNrZXQuZGF0YSA9IF9yZWNvbnN0cnVjdFBhY2tldChwYWNrZXQuZGF0YSwgYnVmZmVycyk7XG4gICAgZGVsZXRlIHBhY2tldC5hdHRhY2htZW50czsgLy8gbm8gbG9uZ2VyIHVzZWZ1bFxuICAgIHJldHVybiBwYWNrZXQ7XG59XG5mdW5jdGlvbiBfcmVjb25zdHJ1Y3RQYWNrZXQoZGF0YSwgYnVmZmVycykge1xuICAgIGlmICghZGF0YSlcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgaWYgKGRhdGEgJiYgZGF0YS5fcGxhY2Vob2xkZXIgPT09IHRydWUpIHtcbiAgICAgICAgY29uc3QgaXNJbmRleFZhbGlkID0gdHlwZW9mIGRhdGEubnVtID09PSBcIm51bWJlclwiICYmXG4gICAgICAgICAgICBkYXRhLm51bSA+PSAwICYmXG4gICAgICAgICAgICBkYXRhLm51bSA8IGJ1ZmZlcnMubGVuZ3RoO1xuICAgICAgICBpZiAoaXNJbmRleFZhbGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gYnVmZmVyc1tkYXRhLm51bV07IC8vIGFwcHJvcHJpYXRlIGJ1ZmZlciAoc2hvdWxkIGJlIG5hdHVyYWwgb3JkZXIgYW55d2F5KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaWxsZWdhbCBhdHRhY2htZW50c1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZGF0YVtpXSA9IF9yZWNvbnN0cnVjdFBhY2tldChkYXRhW2ldLCBidWZmZXJzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZGF0YSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGRhdGEsIGtleSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSBfcmVjb25zdHJ1Y3RQYWNrZXQoZGF0YVtrZXldLCBidWZmZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbn1cbiIsImltcG9ydCB7IEVtaXR0ZXIgfSBmcm9tIFwiQHNvY2tldC5pby9jb21wb25lbnQtZW1pdHRlclwiO1xuaW1wb3J0IHsgZGVjb25zdHJ1Y3RQYWNrZXQsIHJlY29uc3RydWN0UGFja2V0IH0gZnJvbSBcIi4vYmluYXJ5LmpzXCI7XG5pbXBvcnQgeyBpc0JpbmFyeSwgaGFzQmluYXJ5IH0gZnJvbSBcIi4vaXMtYmluYXJ5LmpzXCI7XG4vKipcbiAqIFRoZXNlIHN0cmluZ3MgbXVzdCBub3QgYmUgdXNlZCBhcyBldmVudCBuYW1lcywgYXMgdGhleSBoYXZlIGEgc3BlY2lhbCBtZWFuaW5nLlxuICovXG5jb25zdCBSRVNFUlZFRF9FVkVOVFMgPSBbXG4gICAgXCJjb25uZWN0XCIsXG4gICAgXCJjb25uZWN0X2Vycm9yXCIsXG4gICAgXCJkaXNjb25uZWN0XCIsXG4gICAgXCJkaXNjb25uZWN0aW5nXCIsXG4gICAgXCJuZXdMaXN0ZW5lclwiLFxuICAgIFwicmVtb3ZlTGlzdGVuZXJcIiwgLy8gdXNlZCBieSB0aGUgTm9kZS5qcyBFdmVudEVtaXR0ZXJcbl07XG4vKipcbiAqIFByb3RvY29sIHZlcnNpb24uXG4gKlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgY29uc3QgcHJvdG9jb2wgPSA1O1xuZXhwb3J0IHZhciBQYWNrZXRUeXBlO1xuKGZ1bmN0aW9uIChQYWNrZXRUeXBlKSB7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiQ09OTkVDVFwiXSA9IDBdID0gXCJDT05ORUNUXCI7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiRElTQ09OTkVDVFwiXSA9IDFdID0gXCJESVNDT05ORUNUXCI7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiRVZFTlRcIl0gPSAyXSA9IFwiRVZFTlRcIjtcbiAgICBQYWNrZXRUeXBlW1BhY2tldFR5cGVbXCJBQ0tcIl0gPSAzXSA9IFwiQUNLXCI7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiQ09OTkVDVF9FUlJPUlwiXSA9IDRdID0gXCJDT05ORUNUX0VSUk9SXCI7XG4gICAgUGFja2V0VHlwZVtQYWNrZXRUeXBlW1wiQklOQVJZX0VWRU5UXCJdID0gNV0gPSBcIkJJTkFSWV9FVkVOVFwiO1xuICAgIFBhY2tldFR5cGVbUGFja2V0VHlwZVtcIkJJTkFSWV9BQ0tcIl0gPSA2XSA9IFwiQklOQVJZX0FDS1wiO1xufSkoUGFja2V0VHlwZSB8fCAoUGFja2V0VHlwZSA9IHt9KSk7XG4vKipcbiAqIEEgc29ja2V0LmlvIEVuY29kZXIgaW5zdGFuY2VcbiAqL1xuZXhwb3J0IGNsYXNzIEVuY29kZXIge1xuICAgIC8qKlxuICAgICAqIEVuY29kZXIgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHJlcGxhY2VyIC0gY3VzdG9tIHJlcGxhY2VyIHRvIHBhc3MgZG93biB0byBKU09OLnBhcnNlXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocmVwbGFjZXIpIHtcbiAgICAgICAgdGhpcy5yZXBsYWNlciA9IHJlcGxhY2VyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbmNvZGUgYSBwYWNrZXQgYXMgYSBzaW5nbGUgc3RyaW5nIGlmIG5vbi1iaW5hcnksIG9yIGFzIGFcbiAgICAgKiBidWZmZXIgc2VxdWVuY2UsIGRlcGVuZGluZyBvbiBwYWNrZXQgdHlwZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBwYWNrZXQgb2JqZWN0XG4gICAgICovXG4gICAgZW5jb2RlKG9iaikge1xuICAgICAgICBpZiAob2JqLnR5cGUgPT09IFBhY2tldFR5cGUuRVZFTlQgfHwgb2JqLnR5cGUgPT09IFBhY2tldFR5cGUuQUNLKSB7XG4gICAgICAgICAgICBpZiAoaGFzQmluYXJ5KG9iaikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGVBc0JpbmFyeSh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG9iai50eXBlID09PSBQYWNrZXRUeXBlLkVWRU5UXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFBhY2tldFR5cGUuQklOQVJZX0VWRU5UXG4gICAgICAgICAgICAgICAgICAgICAgICA6IFBhY2tldFR5cGUuQklOQVJZX0FDSyxcbiAgICAgICAgICAgICAgICAgICAgbnNwOiBvYmoubnNwLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBvYmouZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG9iai5pZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RoaXMuZW5jb2RlQXNTdHJpbmcob2JqKV07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuY29kZSBwYWNrZXQgYXMgc3RyaW5nLlxuICAgICAqL1xuICAgIGVuY29kZUFzU3RyaW5nKG9iaikge1xuICAgICAgICAvLyBmaXJzdCBpcyB0eXBlXG4gICAgICAgIGxldCBzdHIgPSBcIlwiICsgb2JqLnR5cGU7XG4gICAgICAgIC8vIGF0dGFjaG1lbnRzIGlmIHdlIGhhdmUgdGhlbVxuICAgICAgICBpZiAob2JqLnR5cGUgPT09IFBhY2tldFR5cGUuQklOQVJZX0VWRU5UIHx8XG4gICAgICAgICAgICBvYmoudHlwZSA9PT0gUGFja2V0VHlwZS5CSU5BUllfQUNLKSB7XG4gICAgICAgICAgICBzdHIgKz0gb2JqLmF0dGFjaG1lbnRzICsgXCItXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIG5hbWVzcGFjZSBvdGhlciB0aGFuIGAvYFxuICAgICAgICAvLyB3ZSBhcHBlbmQgaXQgZm9sbG93ZWQgYnkgYSBjb21tYSBgLGBcbiAgICAgICAgaWYgKG9iai5uc3AgJiYgXCIvXCIgIT09IG9iai5uc3ApIHtcbiAgICAgICAgICAgIHN0ciArPSBvYmoubnNwICsgXCIsXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaW1tZWRpYXRlbHkgZm9sbG93ZWQgYnkgdGhlIGlkXG4gICAgICAgIGlmIChudWxsICE9IG9iai5pZCkge1xuICAgICAgICAgICAgc3RyICs9IG9iai5pZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBqc29uIGRhdGFcbiAgICAgICAgaWYgKG51bGwgIT0gb2JqLmRhdGEpIHtcbiAgICAgICAgICAgIHN0ciArPSBKU09OLnN0cmluZ2lmeShvYmouZGF0YSwgdGhpcy5yZXBsYWNlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW5jb2RlIHBhY2tldCBhcyAnYnVmZmVyIHNlcXVlbmNlJyBieSByZW1vdmluZyBibG9icywgYW5kXG4gICAgICogZGVjb25zdHJ1Y3RpbmcgcGFja2V0IGludG8gb2JqZWN0IHdpdGggcGxhY2Vob2xkZXJzIGFuZFxuICAgICAqIGEgbGlzdCBvZiBidWZmZXJzLlxuICAgICAqL1xuICAgIGVuY29kZUFzQmluYXJ5KG9iaikge1xuICAgICAgICBjb25zdCBkZWNvbnN0cnVjdGlvbiA9IGRlY29uc3RydWN0UGFja2V0KG9iaik7XG4gICAgICAgIGNvbnN0IHBhY2sgPSB0aGlzLmVuY29kZUFzU3RyaW5nKGRlY29uc3RydWN0aW9uLnBhY2tldCk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlcnMgPSBkZWNvbnN0cnVjdGlvbi5idWZmZXJzO1xuICAgICAgICBidWZmZXJzLnVuc2hpZnQocGFjayk7IC8vIGFkZCBwYWNrZXQgaW5mbyB0byBiZWdpbm5pbmcgb2YgZGF0YSBsaXN0XG4gICAgICAgIHJldHVybiBidWZmZXJzOyAvLyB3cml0ZSBhbGwgdGhlIGJ1ZmZlcnNcbiAgICB9XG59XG4vLyBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvODUxMTI4MS9jaGVjay1pZi1hLXZhbHVlLWlzLWFuLW9iamVjdC1pbi1qYXZhc2NyaXB0XG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgT2JqZWN0XVwiO1xufVxuLyoqXG4gKiBBIHNvY2tldC5pbyBEZWNvZGVyIGluc3RhbmNlXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBkZWNvZGVyXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWNvZGVyIGV4dGVuZHMgRW1pdHRlciB7XG4gICAgLyoqXG4gICAgICogRGVjb2RlciBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gcmV2aXZlciAtIGN1c3RvbSByZXZpdmVyIHRvIHBhc3MgZG93biB0byBKU09OLnN0cmluZ2lmeVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJldml2ZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5yZXZpdmVyID0gcmV2aXZlcjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVjb2RlcyBhbiBlbmNvZGVkIHBhY2tldCBzdHJpbmcgaW50byBwYWNrZXQgSlNPTi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvYmogLSBlbmNvZGVkIHBhY2tldFxuICAgICAqL1xuICAgIGFkZChvYmopIHtcbiAgICAgICAgbGV0IHBhY2tldDtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJnb3QgcGxhaW50ZXh0IGRhdGEgd2hlbiByZWNvbnN0cnVjdGluZyBhIHBhY2tldFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhY2tldCA9IHRoaXMuZGVjb2RlU3RyaW5nKG9iaik7XG4gICAgICAgICAgICBjb25zdCBpc0JpbmFyeUV2ZW50ID0gcGFja2V0LnR5cGUgPT09IFBhY2tldFR5cGUuQklOQVJZX0VWRU5UO1xuICAgICAgICAgICAgaWYgKGlzQmluYXJ5RXZlbnQgfHwgcGFja2V0LnR5cGUgPT09IFBhY2tldFR5cGUuQklOQVJZX0FDSykge1xuICAgICAgICAgICAgICAgIHBhY2tldC50eXBlID0gaXNCaW5hcnlFdmVudCA/IFBhY2tldFR5cGUuRVZFTlQgOiBQYWNrZXRUeXBlLkFDSztcbiAgICAgICAgICAgICAgICAvLyBiaW5hcnkgcGFja2V0J3MganNvblxuICAgICAgICAgICAgICAgIHRoaXMucmVjb25zdHJ1Y3RvciA9IG5ldyBCaW5hcnlSZWNvbnN0cnVjdG9yKHBhY2tldCk7XG4gICAgICAgICAgICAgICAgLy8gbm8gYXR0YWNobWVudHMsIGxhYmVsZWQgYmluYXJ5IGJ1dCBubyBiaW5hcnkgZGF0YSB0byBmb2xsb3dcbiAgICAgICAgICAgICAgICBpZiAocGFja2V0LmF0dGFjaG1lbnRzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1cGVyLmVtaXRSZXNlcnZlZChcImRlY29kZWRcIiwgcGFja2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBub24tYmluYXJ5IGZ1bGwgcGFja2V0XG4gICAgICAgICAgICAgICAgc3VwZXIuZW1pdFJlc2VydmVkKFwiZGVjb2RlZFwiLCBwYWNrZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzQmluYXJ5KG9iaikgfHwgb2JqLmJhc2U2NCkge1xuICAgICAgICAgICAgLy8gcmF3IGJpbmFyeSBkYXRhXG4gICAgICAgICAgICBpZiAoIXRoaXMucmVjb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImdvdCBiaW5hcnkgZGF0YSB3aGVuIG5vdCByZWNvbnN0cnVjdGluZyBhIHBhY2tldFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhY2tldCA9IHRoaXMucmVjb25zdHJ1Y3Rvci50YWtlQmluYXJ5RGF0YShvYmopO1xuICAgICAgICAgICAgICAgIGlmIChwYWNrZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVjZWl2ZWQgZmluYWwgYnVmZmVyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVjb25zdHJ1Y3RvciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHN1cGVyLmVtaXRSZXNlcnZlZChcImRlY29kZWRcIiwgcGFja2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHR5cGU6IFwiICsgb2JqKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZWNvZGUgYSBwYWNrZXQgU3RyaW5nIChKU09OIGRhdGEpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBwYWNrZXRcbiAgICAgKi9cbiAgICBkZWNvZGVTdHJpbmcoc3RyKSB7XG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgLy8gbG9vayB1cCB0eXBlXG4gICAgICAgIGNvbnN0IHAgPSB7XG4gICAgICAgICAgICB0eXBlOiBOdW1iZXIoc3RyLmNoYXJBdCgwKSksXG4gICAgICAgIH07XG4gICAgICAgIGlmIChQYWNrZXRUeXBlW3AudHlwZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biBwYWNrZXQgdHlwZSBcIiArIHAudHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbG9vayB1cCBhdHRhY2htZW50cyBpZiB0eXBlIGJpbmFyeVxuICAgICAgICBpZiAocC50eXBlID09PSBQYWNrZXRUeXBlLkJJTkFSWV9FVkVOVCB8fFxuICAgICAgICAgICAgcC50eXBlID09PSBQYWNrZXRUeXBlLkJJTkFSWV9BQ0spIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICB3aGlsZSAoc3RyLmNoYXJBdCgrK2kpICE9PSBcIi1cIiAmJiBpICE9IHN0ci5sZW5ndGgpIHsgfVxuICAgICAgICAgICAgY29uc3QgYnVmID0gc3RyLnN1YnN0cmluZyhzdGFydCwgaSk7XG4gICAgICAgICAgICBpZiAoYnVmICE9IE51bWJlcihidWYpIHx8IHN0ci5jaGFyQXQoaSkgIT09IFwiLVwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSWxsZWdhbCBhdHRhY2htZW50c1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHAuYXR0YWNobWVudHMgPSBOdW1iZXIoYnVmKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBsb29rIHVwIG5hbWVzcGFjZSAoaWYgYW55KVxuICAgICAgICBpZiAoXCIvXCIgPT09IHN0ci5jaGFyQXQoaSArIDEpKSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgICAgd2hpbGUgKCsraSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBzdHIuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChcIixcIiA9PT0gYylcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IHN0ci5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcC5uc3AgPSBzdHIuc3Vic3RyaW5nKHN0YXJ0LCBpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHAubnNwID0gXCIvXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbG9vayB1cCBpZFxuICAgICAgICBjb25zdCBuZXh0ID0gc3RyLmNoYXJBdChpICsgMSk7XG4gICAgICAgIGlmIChcIlwiICE9PSBuZXh0ICYmIE51bWJlcihuZXh0KSA9PSBuZXh0KSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgICAgd2hpbGUgKCsraSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBzdHIuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChudWxsID09IGMgfHwgTnVtYmVyKGMpICE9IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgLS1pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGkgPT09IHN0ci5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcC5pZCA9IE51bWJlcihzdHIuc3Vic3RyaW5nKHN0YXJ0LCBpICsgMSkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGxvb2sgdXAganNvbiBkYXRhXG4gICAgICAgIGlmIChzdHIuY2hhckF0KCsraSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSB0aGlzLnRyeVBhcnNlKHN0ci5zdWJzdHIoaSkpO1xuICAgICAgICAgICAgaWYgKERlY29kZXIuaXNQYXlsb2FkVmFsaWQocC50eXBlLCBwYXlsb2FkKSkge1xuICAgICAgICAgICAgICAgIHAuZGF0YSA9IHBheWxvYWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIHBheWxvYWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxuICAgIHRyeVBhcnNlKHN0cikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2Uoc3RyLCB0aGlzLnJldml2ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3RhdGljIGlzUGF5bG9hZFZhbGlkKHR5cGUsIHBheWxvYWQpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuQ09OTkVDVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNPYmplY3QocGF5bG9hZCk7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuRElTQ09OTkVDVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF5bG9hZCA9PT0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkNPTk5FQ1RfRVJST1I6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBwYXlsb2FkID09PSBcInN0cmluZ1wiIHx8IGlzT2JqZWN0KHBheWxvYWQpO1xuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkVWRU5UOlxuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkJJTkFSWV9FVkVOVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gKEFycmF5LmlzQXJyYXkocGF5bG9hZCkgJiZcbiAgICAgICAgICAgICAgICAgICAgKHR5cGVvZiBwYXlsb2FkWzBdID09PSBcIm51bWJlclwiIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mIHBheWxvYWRbMF0gPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBSRVNFUlZFRF9FVkVOVFMuaW5kZXhPZihwYXlsb2FkWzBdKSA9PT0gLTEpKSk7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuQUNLOlxuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkJJTkFSWV9BQ0s6XG4gICAgICAgICAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkocGF5bG9hZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVhbGxvY2F0ZXMgYSBwYXJzZXIncyByZXNvdXJjZXNcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodGhpcy5yZWNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICB0aGlzLnJlY29uc3RydWN0b3IuZmluaXNoZWRSZWNvbnN0cnVjdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5yZWNvbnN0cnVjdG9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cbi8qKlxuICogQSBtYW5hZ2VyIG9mIGEgYmluYXJ5IGV2ZW50J3MgJ2J1ZmZlciBzZXF1ZW5jZScuIFNob3VsZFxuICogYmUgY29uc3RydWN0ZWQgd2hlbmV2ZXIgYSBwYWNrZXQgb2YgdHlwZSBCSU5BUllfRVZFTlQgaXNcbiAqIGRlY29kZWQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBhY2tldFxuICogQHJldHVybiB7QmluYXJ5UmVjb25zdHJ1Y3Rvcn0gaW5pdGlhbGl6ZWQgcmVjb25zdHJ1Y3RvclxuICovXG5jbGFzcyBCaW5hcnlSZWNvbnN0cnVjdG9yIHtcbiAgICBjb25zdHJ1Y3RvcihwYWNrZXQpIHtcbiAgICAgICAgdGhpcy5wYWNrZXQgPSBwYWNrZXQ7XG4gICAgICAgIHRoaXMuYnVmZmVycyA9IFtdO1xuICAgICAgICB0aGlzLnJlY29uUGFjayA9IHBhY2tldDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGJlIGNhbGxlZCB3aGVuIGJpbmFyeSBkYXRhIHJlY2VpdmVkIGZyb20gY29ubmVjdGlvblxuICAgICAqIGFmdGVyIGEgQklOQVJZX0VWRU5UIHBhY2tldC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QnVmZmVyIHwgQXJyYXlCdWZmZXJ9IGJpbkRhdGEgLSB0aGUgcmF3IGJpbmFyeSBkYXRhIHJlY2VpdmVkXG4gICAgICogQHJldHVybiB7bnVsbCB8IE9iamVjdH0gcmV0dXJucyBudWxsIGlmIG1vcmUgYmluYXJ5IGRhdGEgaXMgZXhwZWN0ZWQgb3JcbiAgICAgKiAgIGEgcmVjb25zdHJ1Y3RlZCBwYWNrZXQgb2JqZWN0IGlmIGFsbCBidWZmZXJzIGhhdmUgYmVlbiByZWNlaXZlZC5cbiAgICAgKi9cbiAgICB0YWtlQmluYXJ5RGF0YShiaW5EYXRhKSB7XG4gICAgICAgIHRoaXMuYnVmZmVycy5wdXNoKGJpbkRhdGEpO1xuICAgICAgICBpZiAodGhpcy5idWZmZXJzLmxlbmd0aCA9PT0gdGhpcy5yZWNvblBhY2suYXR0YWNobWVudHMpIHtcbiAgICAgICAgICAgIC8vIGRvbmUgd2l0aCBidWZmZXIgbGlzdFxuICAgICAgICAgICAgY29uc3QgcGFja2V0ID0gcmVjb25zdHJ1Y3RQYWNrZXQodGhpcy5yZWNvblBhY2ssIHRoaXMuYnVmZmVycyk7XG4gICAgICAgICAgICB0aGlzLmZpbmlzaGVkUmVjb25zdHJ1Y3Rpb24oKTtcbiAgICAgICAgICAgIHJldHVybiBwYWNrZXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFucyB1cCBiaW5hcnkgcGFja2V0IHJlY29uc3RydWN0aW9uIHZhcmlhYmxlcy5cbiAgICAgKi9cbiAgICBmaW5pc2hlZFJlY29uc3RydWN0aW9uKCkge1xuICAgICAgICB0aGlzLnJlY29uUGFjayA9IG51bGw7XG4gICAgICAgIHRoaXMuYnVmZmVycyA9IFtdO1xuICAgIH1cbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBvbihvYmosIGV2LCBmbikge1xuICAgIG9iai5vbihldiwgZm4pO1xuICAgIHJldHVybiBmdW5jdGlvbiBzdWJEZXN0cm95KCkge1xuICAgICAgICBvYmoub2ZmKGV2LCBmbik7XG4gICAgfTtcbn1cbiIsImltcG9ydCB7IFBhY2tldFR5cGUgfSBmcm9tIFwic29ja2V0LmlvLXBhcnNlclwiO1xuaW1wb3J0IHsgb24gfSBmcm9tIFwiLi9vbi5qc1wiO1xuaW1wb3J0IHsgRW1pdHRlciwgfSBmcm9tIFwiQHNvY2tldC5pby9jb21wb25lbnQtZW1pdHRlclwiO1xuLyoqXG4gKiBJbnRlcm5hbCBldmVudHMuXG4gKiBUaGVzZSBldmVudHMgY2FuJ3QgYmUgZW1pdHRlZCBieSB0aGUgdXNlci5cbiAqL1xuY29uc3QgUkVTRVJWRURfRVZFTlRTID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgY29ubmVjdDogMSxcbiAgICBjb25uZWN0X2Vycm9yOiAxLFxuICAgIGRpc2Nvbm5lY3Q6IDEsXG4gICAgZGlzY29ubmVjdGluZzogMSxcbiAgICAvLyBFdmVudEVtaXR0ZXIgcmVzZXJ2ZWQgZXZlbnRzOiBodHRwczovL25vZGVqcy5vcmcvYXBpL2V2ZW50cy5odG1sI2V2ZW50c19ldmVudF9uZXdsaXN0ZW5lclxuICAgIG5ld0xpc3RlbmVyOiAxLFxuICAgIHJlbW92ZUxpc3RlbmVyOiAxLFxufSk7XG4vKipcbiAqIEEgU29ja2V0IGlzIHRoZSBmdW5kYW1lbnRhbCBjbGFzcyBmb3IgaW50ZXJhY3Rpbmcgd2l0aCB0aGUgc2VydmVyLlxuICpcbiAqIEEgU29ja2V0IGJlbG9uZ3MgdG8gYSBjZXJ0YWluIE5hbWVzcGFjZSAoYnkgZGVmYXVsdCAvKSBhbmQgdXNlcyBhbiB1bmRlcmx5aW5nIHtAbGluayBNYW5hZ2VyfSB0byBjb21tdW5pY2F0ZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3Qgc29ja2V0ID0gaW8oKTtcbiAqXG4gKiBzb2NrZXQub24oXCJjb25uZWN0XCIsICgpID0+IHtcbiAqICAgY29uc29sZS5sb2coXCJjb25uZWN0ZWRcIik7XG4gKiB9KTtcbiAqXG4gKiAvLyBzZW5kIGFuIGV2ZW50IHRvIHRoZSBzZXJ2ZXJcbiAqIHNvY2tldC5lbWl0KFwiZm9vXCIsIFwiYmFyXCIpO1xuICpcbiAqIHNvY2tldC5vbihcImZvb2JhclwiLCAoKSA9PiB7XG4gKiAgIC8vIGFuIGV2ZW50IHdhcyByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXJcbiAqIH0pO1xuICpcbiAqIC8vIHVwb24gZGlzY29ubmVjdGlvblxuICogc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAocmVhc29uKSA9PiB7XG4gKiAgIGNvbnNvbGUubG9nKGBkaXNjb25uZWN0ZWQgZHVlIHRvICR7cmVhc29ufWApO1xuICogfSk7XG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXQgZXh0ZW5kcyBFbWl0dGVyIHtcbiAgICAvKipcbiAgICAgKiBgU29ja2V0YCBjb25zdHJ1Y3Rvci5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpbywgbnNwLCBvcHRzKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBzb2NrZXQgaXMgY3VycmVudGx5IGNvbm5lY3RlZCB0byB0aGUgc2VydmVyLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiBjb25zdCBzb2NrZXQgPSBpbygpO1xuICAgICAgICAgKlxuICAgICAgICAgKiBzb2NrZXQub24oXCJjb25uZWN0XCIsICgpID0+IHtcbiAgICAgICAgICogICBjb25zb2xlLmxvZyhzb2NrZXQuY29ubmVjdGVkKTsgLy8gdHJ1ZVxuICAgICAgICAgKiB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XG4gICAgICAgICAqICAgY29uc29sZS5sb2coc29ja2V0LmNvbm5lY3RlZCk7IC8vIGZhbHNlXG4gICAgICAgICAqIH0pO1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIGNvbm5lY3Rpb24gc3RhdGUgd2FzIHJlY292ZXJlZCBhZnRlciBhIHRlbXBvcmFyeSBkaXNjb25uZWN0aW9uLiBJbiB0aGF0IGNhc2UsIGFueSBtaXNzZWQgcGFja2V0cyB3aWxsXG4gICAgICAgICAqIGJlIHRyYW5zbWl0dGVkIGJ5IHRoZSBzZXJ2ZXIuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlY292ZXJlZCA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogQnVmZmVyIGZvciBwYWNrZXRzIHJlY2VpdmVkIGJlZm9yZSB0aGUgQ09OTkVDVCBwYWNrZXRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVjZWl2ZUJ1ZmZlciA9IFtdO1xuICAgICAgICAvKipcbiAgICAgICAgICogQnVmZmVyIGZvciBwYWNrZXRzIHRoYXQgd2lsbCBiZSBzZW50IG9uY2UgdGhlIHNvY2tldCBpcyBjb25uZWN0ZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2VuZEJ1ZmZlciA9IFtdO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHF1ZXVlIG9mIHBhY2tldHMgdG8gYmUgc2VudCB3aXRoIHJldHJ5IGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgICAgICpcbiAgICAgICAgICogUGFja2V0cyBhcmUgc2VudCBvbmUgYnkgb25lLCBlYWNoIHdhaXRpbmcgZm9yIHRoZSBzZXJ2ZXIgYWNrbm93bGVkZ2VtZW50LCBpbiBvcmRlciB0byBndWFyYW50ZWUgdGhlIGRlbGl2ZXJ5IG9yZGVyLlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fcXVldWUgPSBbXTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEEgc2VxdWVuY2UgdG8gZ2VuZXJhdGUgdGhlIElEIG9mIHRoZSB7QGxpbmsgUXVldWVkUGFja2V0fS5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3F1ZXVlU2VxID0gMDtcbiAgICAgICAgdGhpcy5pZHMgPSAwO1xuICAgICAgICB0aGlzLmFja3MgPSB7fTtcbiAgICAgICAgdGhpcy5mbGFncyA9IHt9O1xuICAgICAgICB0aGlzLmlvID0gaW87XG4gICAgICAgIHRoaXMubnNwID0gbnNwO1xuICAgICAgICBpZiAob3B0cyAmJiBvcHRzLmF1dGgpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0aCA9IG9wdHMuYXV0aDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0cyk7XG4gICAgICAgIGlmICh0aGlzLmlvLl9hdXRvQ29ubmVjdClcbiAgICAgICAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoZSBzb2NrZXQgaXMgY3VycmVudGx5IGRpc2Nvbm5lY3RlZFxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCBzb2NrZXQgPSBpbygpO1xuICAgICAqXG4gICAgICogc29ja2V0Lm9uKFwiY29ubmVjdFwiLCAoKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhzb2NrZXQuZGlzY29ubmVjdGVkKTsgLy8gZmFsc2VcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIHNvY2tldC5vbihcImRpc2Nvbm5lY3RcIiwgKCkgPT4ge1xuICAgICAqICAgY29uc29sZS5sb2coc29ja2V0LmRpc2Nvbm5lY3RlZCk7IC8vIHRydWVcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBnZXQgZGlzY29ubmVjdGVkKCkge1xuICAgICAgICByZXR1cm4gIXRoaXMuY29ubmVjdGVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gb3BlbiwgY2xvc2UgYW5kIHBhY2tldCBldmVudHNcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgc3ViRXZlbnRzKCkge1xuICAgICAgICBpZiAodGhpcy5zdWJzKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBpbyA9IHRoaXMuaW87XG4gICAgICAgIHRoaXMuc3VicyA9IFtcbiAgICAgICAgICAgIG9uKGlvLCBcIm9wZW5cIiwgdGhpcy5vbm9wZW4uYmluZCh0aGlzKSksXG4gICAgICAgICAgICBvbihpbywgXCJwYWNrZXRcIiwgdGhpcy5vbnBhY2tldC5iaW5kKHRoaXMpKSxcbiAgICAgICAgICAgIG9uKGlvLCBcImVycm9yXCIsIHRoaXMub25lcnJvci5iaW5kKHRoaXMpKSxcbiAgICAgICAgICAgIG9uKGlvLCBcImNsb3NlXCIsIHRoaXMub25jbG9zZS5iaW5kKHRoaXMpKSxcbiAgICAgICAgXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV2hldGhlciB0aGUgU29ja2V0IHdpbGwgdHJ5IHRvIHJlY29ubmVjdCB3aGVuIGl0cyBNYW5hZ2VyIGNvbm5lY3RzIG9yIHJlY29ubmVjdHMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IHNvY2tldCA9IGlvKCk7XG4gICAgICpcbiAgICAgKiBjb25zb2xlLmxvZyhzb2NrZXQuYWN0aXZlKTsgLy8gdHJ1ZVxuICAgICAqXG4gICAgICogc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAocmVhc29uKSA9PiB7XG4gICAgICogICBpZiAocmVhc29uID09PSBcImlvIHNlcnZlciBkaXNjb25uZWN0XCIpIHtcbiAgICAgKiAgICAgLy8gdGhlIGRpc2Nvbm5lY3Rpb24gd2FzIGluaXRpYXRlZCBieSB0aGUgc2VydmVyLCB5b3UgbmVlZCB0byBtYW51YWxseSByZWNvbm5lY3RcbiAgICAgKiAgICAgY29uc29sZS5sb2coc29ja2V0LmFjdGl2ZSk7IC8vIGZhbHNlXG4gICAgICogICB9XG4gICAgICogICAvLyBlbHNlIHRoZSBzb2NrZXQgd2lsbCBhdXRvbWF0aWNhbGx5IHRyeSB0byByZWNvbm5lY3RcbiAgICAgKiAgIGNvbnNvbGUubG9nKHNvY2tldC5hY3RpdmUpOyAvLyB0cnVlXG4gICAgICogfSk7XG4gICAgICovXG4gICAgZ2V0IGFjdGl2ZSgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5zdWJzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBcIk9wZW5zXCIgdGhlIHNvY2tldC5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc3Qgc29ja2V0ID0gaW8oe1xuICAgICAqICAgYXV0b0Nvbm5lY3Q6IGZhbHNlXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBzb2NrZXQuY29ubmVjdCgpO1xuICAgICAqL1xuICAgIGNvbm5lY3QoKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbm5lY3RlZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB0aGlzLnN1YkV2ZW50cygpO1xuICAgICAgICBpZiAoIXRoaXMuaW9bXCJfcmVjb25uZWN0aW5nXCJdKVxuICAgICAgICAgICAgdGhpcy5pby5vcGVuKCk7IC8vIGVuc3VyZSBvcGVuXG4gICAgICAgIGlmIChcIm9wZW5cIiA9PT0gdGhpcy5pby5fcmVhZHlTdGF0ZSlcbiAgICAgICAgICAgIHRoaXMub25vcGVuKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3Ige0BsaW5rIGNvbm5lY3QoKX0uXG4gICAgICovXG4gICAgb3BlbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZW5kcyBhIGBtZXNzYWdlYCBldmVudC5cbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIG1pbWljcyB0aGUgV2ViU29ja2V0LnNlbmQoKSBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9XZWJTb2NrZXQvc2VuZFxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBzb2NrZXQuc2VuZChcImhlbGxvXCIpO1xuICAgICAqXG4gICAgICogLy8gdGhpcyBpcyBlcXVpdmFsZW50IHRvXG4gICAgICogc29ja2V0LmVtaXQoXCJtZXNzYWdlXCIsIFwiaGVsbG9cIik7XG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHNlbGZcbiAgICAgKi9cbiAgICBzZW5kKC4uLmFyZ3MpIHtcbiAgICAgICAgYXJncy51bnNoaWZ0KFwibWVzc2FnZVwiKTtcbiAgICAgICAgdGhpcy5lbWl0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgYGVtaXRgLlxuICAgICAqIElmIHRoZSBldmVudCBpcyBpbiBgZXZlbnRzYCwgaXQncyBlbWl0dGVkIG5vcm1hbGx5LlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBzb2NrZXQuZW1pdChcImhlbGxvXCIsIFwid29ybGRcIik7XG4gICAgICpcbiAgICAgKiAvLyBhbGwgc2VyaWFsaXphYmxlIGRhdGFzdHJ1Y3R1cmVzIGFyZSBzdXBwb3J0ZWQgKG5vIG5lZWQgdG8gY2FsbCBKU09OLnN0cmluZ2lmeSlcbiAgICAgKiBzb2NrZXQuZW1pdChcImhlbGxvXCIsIDEsIFwiMlwiLCB7IDM6IFtcIjRcIl0sIDU6IFVpbnQ4QXJyYXkuZnJvbShbNl0pIH0pO1xuICAgICAqXG4gICAgICogLy8gd2l0aCBhbiBhY2tub3dsZWRnZW1lbnQgZnJvbSB0aGUgc2VydmVyXG4gICAgICogc29ja2V0LmVtaXQoXCJoZWxsb1wiLCBcIndvcmxkXCIsICh2YWwpID0+IHtcbiAgICAgKiAgIC8vIC4uLlxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogQHJldHVybiBzZWxmXG4gICAgICovXG4gICAgZW1pdChldiwgLi4uYXJncykge1xuICAgICAgICBpZiAoUkVTRVJWRURfRVZFTlRTLmhhc093blByb3BlcnR5KGV2KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcIicgKyBldi50b1N0cmluZygpICsgJ1wiIGlzIGEgcmVzZXJ2ZWQgZXZlbnQgbmFtZScpO1xuICAgICAgICB9XG4gICAgICAgIGFyZ3MudW5zaGlmdChldik7XG4gICAgICAgIGlmICh0aGlzLl9vcHRzLnJldHJpZXMgJiYgIXRoaXMuZmxhZ3MuZnJvbVF1ZXVlICYmICF0aGlzLmZsYWdzLnZvbGF0aWxlKSB7XG4gICAgICAgICAgICB0aGlzLl9hZGRUb1F1ZXVlKGFyZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFja2V0ID0ge1xuICAgICAgICAgICAgdHlwZTogUGFja2V0VHlwZS5FVkVOVCxcbiAgICAgICAgICAgIGRhdGE6IGFyZ3MsXG4gICAgICAgIH07XG4gICAgICAgIHBhY2tldC5vcHRpb25zID0ge307XG4gICAgICAgIHBhY2tldC5vcHRpb25zLmNvbXByZXNzID0gdGhpcy5mbGFncy5jb21wcmVzcyAhPT0gZmFsc2U7XG4gICAgICAgIC8vIGV2ZW50IGFjayBjYWxsYmFja1xuICAgICAgICBpZiAoXCJmdW5jdGlvblwiID09PSB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdKSB7XG4gICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMuaWRzKys7XG4gICAgICAgICAgICBjb25zdCBhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdGhpcy5fcmVnaXN0ZXJBY2tDYWxsYmFjayhpZCwgYWNrKTtcbiAgICAgICAgICAgIHBhY2tldC5pZCA9IGlkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGlzVHJhbnNwb3J0V3JpdGFibGUgPSB0aGlzLmlvLmVuZ2luZSAmJlxuICAgICAgICAgICAgdGhpcy5pby5lbmdpbmUudHJhbnNwb3J0ICYmXG4gICAgICAgICAgICB0aGlzLmlvLmVuZ2luZS50cmFuc3BvcnQud3JpdGFibGU7XG4gICAgICAgIGNvbnN0IGRpc2NhcmRQYWNrZXQgPSB0aGlzLmZsYWdzLnZvbGF0aWxlICYmICghaXNUcmFuc3BvcnRXcml0YWJsZSB8fCAhdGhpcy5jb25uZWN0ZWQpO1xuICAgICAgICBpZiAoZGlzY2FyZFBhY2tldCkge1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLm5vdGlmeU91dGdvaW5nTGlzdGVuZXJzKHBhY2tldCk7XG4gICAgICAgICAgICB0aGlzLnBhY2tldChwYWNrZXQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZW5kQnVmZmVyLnB1c2gocGFja2V0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZsYWdzID0ge307XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9yZWdpc3RlckFja0NhbGxiYWNrKGlkLCBhY2spIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBjb25zdCB0aW1lb3V0ID0gKF9hID0gdGhpcy5mbGFncy50aW1lb3V0KSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiB0aGlzLl9vcHRzLmFja1RpbWVvdXQ7XG4gICAgICAgIGlmICh0aW1lb3V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYWNrc1tpZF0gPSBhY2s7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBjb25zdCB0aW1lciA9IHRoaXMuaW8uc2V0VGltZW91dEZuKCgpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmFja3NbaWRdO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNlbmRCdWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZW5kQnVmZmVyW2ldLmlkID09PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRCdWZmZXIuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjay5jYWxsKHRoaXMsIG5ldyBFcnJvcihcIm9wZXJhdGlvbiBoYXMgdGltZWQgb3V0XCIpKTtcbiAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgIHRoaXMuYWNrc1tpZF0gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgdGhpcy5pby5jbGVhclRpbWVvdXRGbih0aW1lcik7XG4gICAgICAgICAgICBhY2suYXBwbHkodGhpcywgW251bGwsIC4uLmFyZ3NdKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW1pdHMgYW4gZXZlbnQgYW5kIHdhaXRzIGZvciBhbiBhY2tub3dsZWRnZW1lbnRcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gd2l0aG91dCB0aW1lb3V0XG4gICAgICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzb2NrZXQuZW1pdFdpdGhBY2soXCJoZWxsb1wiLCBcIndvcmxkXCIpO1xuICAgICAqXG4gICAgICogLy8gd2l0aCBhIHNwZWNpZmljIHRpbWVvdXRcbiAgICAgKiB0cnkge1xuICAgICAqICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzb2NrZXQudGltZW91dCgxMDAwKS5lbWl0V2l0aEFjayhcImhlbGxvXCIsIFwid29ybGRcIik7XG4gICAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAgICogICAvLyB0aGUgc2VydmVyIGRpZCBub3QgYWNrbm93bGVkZ2UgdGhlIGV2ZW50IGluIHRoZSBnaXZlbiBkZWxheVxuICAgICAqIH1cbiAgICAgKlxuICAgICAqIEByZXR1cm4gYSBQcm9taXNlIHRoYXQgd2lsbCBiZSBmdWxmaWxsZWQgd2hlbiB0aGUgc2VydmVyIGFja25vd2xlZGdlcyB0aGUgZXZlbnRcbiAgICAgKi9cbiAgICBlbWl0V2l0aEFjayhldiwgLi4uYXJncykge1xuICAgICAgICAvLyB0aGUgdGltZW91dCBmbGFnIGlzIG9wdGlvbmFsXG4gICAgICAgIGNvbnN0IHdpdGhFcnIgPSB0aGlzLmZsYWdzLnRpbWVvdXQgIT09IHVuZGVmaW5lZCB8fCB0aGlzLl9vcHRzLmFja1RpbWVvdXQgIT09IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGFyZ3MucHVzaCgoYXJnMSwgYXJnMikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh3aXRoRXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmcxID8gcmVqZWN0KGFyZzEpIDogcmVzb2x2ZShhcmcyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKGFyZzEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5lbWl0KGV2LCAuLi5hcmdzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZCB0aGUgcGFja2V0IHRvIHRoZSBxdWV1ZS5cbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2FkZFRvUXVldWUoYXJncykge1xuICAgICAgICBsZXQgYWNrO1xuICAgICAgICBpZiAodHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhY2tldCA9IHtcbiAgICAgICAgICAgIGlkOiB0aGlzLl9xdWV1ZVNlcSsrLFxuICAgICAgICAgICAgdHJ5Q291bnQ6IDAsXG4gICAgICAgICAgICBwZW5kaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGFyZ3MsXG4gICAgICAgICAgICBmbGFnczogT2JqZWN0LmFzc2lnbih7IGZyb21RdWV1ZTogdHJ1ZSB9LCB0aGlzLmZsYWdzKSxcbiAgICAgICAgfTtcbiAgICAgICAgYXJncy5wdXNoKChlcnIsIC4uLnJlc3BvbnNlQXJncykgPT4ge1xuICAgICAgICAgICAgaWYgKHBhY2tldCAhPT0gdGhpcy5fcXVldWVbMF0pIHtcbiAgICAgICAgICAgICAgICAvLyB0aGUgcGFja2V0IGhhcyBhbHJlYWR5IGJlZW4gYWNrbm93bGVkZ2VkXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaGFzRXJyb3IgPSBlcnIgIT09IG51bGw7XG4gICAgICAgICAgICBpZiAoaGFzRXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFja2V0LnRyeUNvdW50ID4gdGhpcy5fb3B0cy5yZXRyaWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3F1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBpZiAoYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjayhudWxsLCAuLi5yZXNwb25zZUFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhY2tldC5wZW5kaW5nID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZHJhaW5RdWV1ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fcXVldWUucHVzaChwYWNrZXQpO1xuICAgICAgICB0aGlzLl9kcmFpblF1ZXVlKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNlbmQgdGhlIGZpcnN0IHBhY2tldCBvZiB0aGUgcXVldWUsIGFuZCB3YWl0IGZvciBhbiBhY2tub3dsZWRnZW1lbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSBmb3JjZSAtIHdoZXRoZXIgdG8gcmVzZW5kIGEgcGFja2V0IHRoYXQgaGFzIG5vdCBiZWVuIGFja25vd2xlZGdlZCB5ZXRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2RyYWluUXVldWUoZm9yY2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAoIXRoaXMuY29ubmVjdGVkIHx8IHRoaXMuX3F1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhY2tldCA9IHRoaXMuX3F1ZXVlWzBdO1xuICAgICAgICBpZiAocGFja2V0LnBlbmRpbmcgJiYgIWZvcmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcGFja2V0LnBlbmRpbmcgPSB0cnVlO1xuICAgICAgICBwYWNrZXQudHJ5Q291bnQrKztcbiAgICAgICAgdGhpcy5mbGFncyA9IHBhY2tldC5mbGFncztcbiAgICAgICAgdGhpcy5lbWl0LmFwcGx5KHRoaXMsIHBhY2tldC5hcmdzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2VuZHMgYSBwYWNrZXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFja2V0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBwYWNrZXQocGFja2V0KSB7XG4gICAgICAgIHBhY2tldC5uc3AgPSB0aGlzLm5zcDtcbiAgICAgICAgdGhpcy5pby5fcGFja2V0KHBhY2tldCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIGVuZ2luZSBgb3BlbmAuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9ub3BlbigpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLmF1dGggPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aGlzLmF1dGgoKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZW5kQ29ubmVjdFBhY2tldChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2VuZENvbm5lY3RQYWNrZXQodGhpcy5hdXRoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZW5kcyBhIENPTk5FQ1QgcGFja2V0IHRvIGluaXRpYXRlIHRoZSBTb2NrZXQuSU8gc2Vzc2lvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc2VuZENvbm5lY3RQYWNrZXQoZGF0YSkge1xuICAgICAgICB0aGlzLnBhY2tldCh7XG4gICAgICAgICAgICB0eXBlOiBQYWNrZXRUeXBlLkNPTk5FQ1QsXG4gICAgICAgICAgICBkYXRhOiB0aGlzLl9waWRcbiAgICAgICAgICAgICAgICA/IE9iamVjdC5hc3NpZ24oeyBwaWQ6IHRoaXMuX3BpZCwgb2Zmc2V0OiB0aGlzLl9sYXN0T2Zmc2V0IH0sIGRhdGEpXG4gICAgICAgICAgICAgICAgOiBkYXRhLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gZW5naW5lIG9yIG1hbmFnZXIgYGVycm9yYC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBlcnJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uZXJyb3IoZXJyKSB7XG4gICAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwiY29ubmVjdF9lcnJvclwiLCBlcnIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIGVuZ2luZSBgY2xvc2VgLlxuICAgICAqXG4gICAgICogQHBhcmFtIHJlYXNvblxuICAgICAqIEBwYXJhbSBkZXNjcmlwdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25jbG9zZShyZWFzb24sIGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmlkO1xuICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImRpc2Nvbm5lY3RcIiwgcmVhc29uLCBkZXNjcmlwdGlvbik7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB3aXRoIHNvY2tldCBwYWNrZXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFja2V0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbnBhY2tldChwYWNrZXQpIHtcbiAgICAgICAgY29uc3Qgc2FtZU5hbWVzcGFjZSA9IHBhY2tldC5uc3AgPT09IHRoaXMubnNwO1xuICAgICAgICBpZiAoIXNhbWVOYW1lc3BhY2UpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHN3aXRjaCAocGFja2V0LnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgUGFja2V0VHlwZS5DT05ORUNUOlxuICAgICAgICAgICAgICAgIGlmIChwYWNrZXQuZGF0YSAmJiBwYWNrZXQuZGF0YS5zaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbmNvbm5lY3QocGFja2V0LmRhdGEuc2lkLCBwYWNrZXQuZGF0YS5waWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJjb25uZWN0X2Vycm9yXCIsIG5ldyBFcnJvcihcIkl0IHNlZW1zIHlvdSBhcmUgdHJ5aW5nIHRvIHJlYWNoIGEgU29ja2V0LklPIHNlcnZlciBpbiB2Mi54IHdpdGggYSB2My54IGNsaWVudCwgYnV0IHRoZXkgYXJlIG5vdCBjb21wYXRpYmxlIChtb3JlIGluZm9ybWF0aW9uIGhlcmU6IGh0dHBzOi8vc29ja2V0LmlvL2RvY3MvdjMvbWlncmF0aW5nLWZyb20tMi14LXRvLTMtMC8pXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuRVZFTlQ6XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuQklOQVJZX0VWRU5UOlxuICAgICAgICAgICAgICAgIHRoaXMub25ldmVudChwYWNrZXQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBQYWNrZXRUeXBlLkFDSzpcbiAgICAgICAgICAgIGNhc2UgUGFja2V0VHlwZS5CSU5BUllfQUNLOlxuICAgICAgICAgICAgICAgIHRoaXMub25hY2socGFja2V0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgUGFja2V0VHlwZS5ESVNDT05ORUNUOlxuICAgICAgICAgICAgICAgIHRoaXMub25kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFBhY2tldFR5cGUuQ09OTkVDVF9FUlJPUjpcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IocGFja2V0LmRhdGEubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgIGVyci5kYXRhID0gcGFja2V0LmRhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImNvbm5lY3RfZXJyb3JcIiwgZXJyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBhIHNlcnZlciBldmVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYWNrZXRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uZXZlbnQocGFja2V0KSB7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBwYWNrZXQuZGF0YSB8fCBbXTtcbiAgICAgICAgaWYgKG51bGwgIT0gcGFja2V0LmlkKSB7XG4gICAgICAgICAgICBhcmdzLnB1c2godGhpcy5hY2socGFja2V0LmlkKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXRFdmVudChhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVjZWl2ZUJ1ZmZlci5wdXNoKE9iamVjdC5mcmVlemUoYXJncykpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVtaXRFdmVudChhcmdzKSB7XG4gICAgICAgIGlmICh0aGlzLl9hbnlMaXN0ZW5lcnMgJiYgdGhpcy5fYW55TGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gdGhpcy5fYW55TGlzdGVuZXJzLnNsaWNlKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHN1cGVyLmVtaXQuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIGlmICh0aGlzLl9waWQgJiYgYXJncy5sZW5ndGggJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdGhpcy5fbGFzdE9mZnNldCA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9kdWNlcyBhbiBhY2sgY2FsbGJhY2sgdG8gZW1pdCB3aXRoIGFuIGV2ZW50LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBhY2soaWQpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGxldCBzZW50ID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAgICAgLy8gcHJldmVudCBkb3VibGUgY2FsbGJhY2tzXG4gICAgICAgICAgICBpZiAoc2VudClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBzZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgIHNlbGYucGFja2V0KHtcbiAgICAgICAgICAgICAgICB0eXBlOiBQYWNrZXRUeXBlLkFDSyxcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgZGF0YTogYXJncyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBhIHNlcnZlciBhY2tub3dsZWdlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYWNrZXRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uYWNrKHBhY2tldCkge1xuICAgICAgICBjb25zdCBhY2sgPSB0aGlzLmFja3NbcGFja2V0LmlkXTtcbiAgICAgICAgaWYgKFwiZnVuY3Rpb25cIiA9PT0gdHlwZW9mIGFjaykge1xuICAgICAgICAgICAgYWNrLmFwcGx5KHRoaXMsIHBhY2tldC5kYXRhKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmFja3NbcGFja2V0LmlkXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBzZXJ2ZXIgY29ubmVjdC5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25jb25uZWN0KGlkLCBwaWQpIHtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLnJlY292ZXJlZCA9IHBpZCAmJiB0aGlzLl9waWQgPT09IHBpZDtcbiAgICAgICAgdGhpcy5fcGlkID0gcGlkOyAvLyBkZWZpbmVkIG9ubHkgaWYgY29ubmVjdGlvbiBzdGF0ZSByZWNvdmVyeSBpcyBlbmFibGVkXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5lbWl0QnVmZmVyZWQoKTtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJjb25uZWN0XCIpO1xuICAgICAgICB0aGlzLl9kcmFpblF1ZXVlKHRydWUpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbWl0IGJ1ZmZlcmVkIGV2ZW50cyAocmVjZWl2ZWQgYW5kIGVtaXR0ZWQpLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBlbWl0QnVmZmVyZWQoKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZUJ1ZmZlci5mb3JFYWNoKChhcmdzKSA9PiB0aGlzLmVtaXRFdmVudChhcmdzKSk7XG4gICAgICAgIHRoaXMucmVjZWl2ZUJ1ZmZlciA9IFtdO1xuICAgICAgICB0aGlzLnNlbmRCdWZmZXIuZm9yRWFjaCgocGFja2V0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm5vdGlmeU91dGdvaW5nTGlzdGVuZXJzKHBhY2tldCk7XG4gICAgICAgICAgICB0aGlzLnBhY2tldChwYWNrZXQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zZW5kQnVmZmVyID0gW107XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIHNlcnZlciBkaXNjb25uZWN0LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbmRpc2Nvbm5lY3QoKSB7XG4gICAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgICB0aGlzLm9uY2xvc2UoXCJpbyBzZXJ2ZXIgZGlzY29ubmVjdFwiKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gZm9yY2VkIGNsaWVudC9zZXJ2ZXIgc2lkZSBkaXNjb25uZWN0aW9ucyxcbiAgICAgKiB0aGlzIG1ldGhvZCBlbnN1cmVzIHRoZSBtYW5hZ2VyIHN0b3BzIHRyYWNraW5nIHVzIGFuZFxuICAgICAqIHRoYXQgcmVjb25uZWN0aW9ucyBkb24ndCBnZXQgdHJpZ2dlcmVkIGZvciB0aGlzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodGhpcy5zdWJzKSB7XG4gICAgICAgICAgICAvLyBjbGVhbiBzdWJzY3JpcHRpb25zIHRvIGF2b2lkIHJlY29ubmVjdGlvbnNcbiAgICAgICAgICAgIHRoaXMuc3Vicy5mb3JFYWNoKChzdWJEZXN0cm95KSA9PiBzdWJEZXN0cm95KCkpO1xuICAgICAgICAgICAgdGhpcy5zdWJzID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaW9bXCJfZGVzdHJveVwiXSh0aGlzKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGlzY29ubmVjdHMgdGhlIHNvY2tldCBtYW51YWxseS4gSW4gdGhhdCBjYXNlLCB0aGUgc29ja2V0IHdpbGwgbm90IHRyeSB0byByZWNvbm5lY3QuXG4gICAgICpcbiAgICAgKiBJZiB0aGlzIGlzIHRoZSBsYXN0IGFjdGl2ZSBTb2NrZXQgaW5zdGFuY2Ugb2YgdGhlIHtAbGluayBNYW5hZ2VyfSwgdGhlIGxvdy1sZXZlbCBjb25uZWN0aW9uIHdpbGwgYmUgY2xvc2VkLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBjb25zdCBzb2NrZXQgPSBpbygpO1xuICAgICAqXG4gICAgICogc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAocmVhc29uKSA9PiB7XG4gICAgICogICAvLyBjb25zb2xlLmxvZyhyZWFzb24pOyBwcmludHMgXCJpbyBjbGllbnQgZGlzY29ubmVjdFwiXG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBzb2NrZXQuZGlzY29ubmVjdCgpO1xuICAgICAqXG4gICAgICogQHJldHVybiBzZWxmXG4gICAgICovXG4gICAgZGlzY29ubmVjdCgpIHtcbiAgICAgICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICB0aGlzLnBhY2tldCh7IHR5cGU6IFBhY2tldFR5cGUuRElTQ09OTkVDVCB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyByZW1vdmUgc29ja2V0IGZyb20gcG9vbFxuICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgaWYgKHRoaXMuY29ubmVjdGVkKSB7XG4gICAgICAgICAgICAvLyBmaXJlIGV2ZW50c1xuICAgICAgICAgICAgdGhpcy5vbmNsb3NlKFwiaW8gY2xpZW50IGRpc2Nvbm5lY3RcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciB7QGxpbmsgZGlzY29ubmVjdCgpfS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4gc2VsZlxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGNvbXByZXNzIGZsYWcuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHNvY2tldC5jb21wcmVzcyhmYWxzZSkuZW1pdChcImhlbGxvXCIpO1xuICAgICAqXG4gICAgICogQHBhcmFtIGNvbXByZXNzIC0gaWYgYHRydWVgLCBjb21wcmVzc2VzIHRoZSBzZW5kaW5nIGRhdGFcbiAgICAgKiBAcmV0dXJuIHNlbGZcbiAgICAgKi9cbiAgICBjb21wcmVzcyhjb21wcmVzcykge1xuICAgICAgICB0aGlzLmZsYWdzLmNvbXByZXNzID0gY29tcHJlc3M7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbW9kaWZpZXIgZm9yIGEgc3Vic2VxdWVudCBldmVudCBlbWlzc2lvbiB0aGF0IHRoZSBldmVudCBtZXNzYWdlIHdpbGwgYmUgZHJvcHBlZCB3aGVuIHRoaXMgc29ja2V0IGlzIG5vdFxuICAgICAqIHJlYWR5IHRvIHNlbmQgbWVzc2FnZXMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHNvY2tldC52b2xhdGlsZS5lbWl0KFwiaGVsbG9cIik7IC8vIHRoZSBzZXJ2ZXIgbWF5IG9yIG1heSBub3QgcmVjZWl2ZSBpdFxuICAgICAqXG4gICAgICogQHJldHVybnMgc2VsZlxuICAgICAqL1xuICAgIGdldCB2b2xhdGlsZSgpIHtcbiAgICAgICAgdGhpcy5mbGFncy52b2xhdGlsZSA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIGEgbW9kaWZpZXIgZm9yIGEgc3Vic2VxdWVudCBldmVudCBlbWlzc2lvbiB0aGF0IHRoZSBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCB3aXRoIGFuIGVycm9yIHdoZW4gdGhlXG4gICAgICogZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgd2l0aG91dCBhbiBhY2tub3dsZWRnZW1lbnQgZnJvbSB0aGUgc2VydmVyOlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBzb2NrZXQudGltZW91dCg1MDAwKS5lbWl0KFwibXktZXZlbnRcIiwgKGVycikgPT4ge1xuICAgICAqICAgaWYgKGVycikge1xuICAgICAqICAgICAvLyB0aGUgc2VydmVyIGRpZCBub3QgYWNrbm93bGVkZ2UgdGhlIGV2ZW50IGluIHRoZSBnaXZlbiBkZWxheVxuICAgICAqICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogQHJldHVybnMgc2VsZlxuICAgICAqL1xuICAgIHRpbWVvdXQodGltZW91dCkge1xuICAgICAgICB0aGlzLmZsYWdzLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBmaXJlZCB3aGVuIGFueSBldmVudCBpcyBlbWl0dGVkLiBUaGUgZXZlbnQgbmFtZSBpcyBwYXNzZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZVxuICAgICAqIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBzb2NrZXQub25BbnkoKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhgZ290ICR7ZXZlbnR9YCk7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKi9cbiAgICBvbkFueShsaXN0ZW5lcikge1xuICAgICAgICB0aGlzLl9hbnlMaXN0ZW5lcnMgPSB0aGlzLl9hbnlMaXN0ZW5lcnMgfHwgW107XG4gICAgICAgIHRoaXMuX2FueUxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgZmlyZWQgd2hlbiBhbnkgZXZlbnQgaXMgZW1pdHRlZC4gVGhlIGV2ZW50IG5hbWUgaXMgcGFzc2VkIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGVcbiAgICAgKiBjYWxsYmFjay4gVGhlIGxpc3RlbmVyIGlzIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpc3RlbmVycyBhcnJheS5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogc29ja2V0LnByZXBlbmRBbnkoKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhgZ290IGV2ZW50ICR7ZXZlbnR9YCk7XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKi9cbiAgICBwcmVwZW5kQW55KGxpc3RlbmVyKSB7XG4gICAgICAgIHRoaXMuX2FueUxpc3RlbmVycyA9IHRoaXMuX2FueUxpc3RlbmVycyB8fCBbXTtcbiAgICAgICAgdGhpcy5fYW55TGlzdGVuZXJzLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGZpcmVkIHdoZW4gYW55IGV2ZW50IGlzIGVtaXR0ZWQuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IGNhdGNoQWxsTGlzdGVuZXIgPSAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGBnb3QgZXZlbnQgJHtldmVudH1gKTtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiBzb2NrZXQub25BbnkoY2F0Y2hBbGxMaXN0ZW5lcik7XG4gICAgICpcbiAgICAgKiAvLyByZW1vdmUgYSBzcGVjaWZpYyBsaXN0ZW5lclxuICAgICAqIHNvY2tldC5vZmZBbnkoY2F0Y2hBbGxMaXN0ZW5lcik7XG4gICAgICpcbiAgICAgKiAvLyBvciByZW1vdmUgYWxsIGxpc3RlbmVyc1xuICAgICAqIHNvY2tldC5vZmZBbnkoKTtcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqL1xuICAgIG9mZkFueShsaXN0ZW5lcikge1xuICAgICAgICBpZiAoIXRoaXMuX2FueUxpc3RlbmVycykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSB0aGlzLl9hbnlMaXN0ZW5lcnM7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lciA9PT0gbGlzdGVuZXJzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2FueUxpc3RlbmVycyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGxpc3RlbmVycyB0aGF0IGFyZSBsaXN0ZW5pbmcgZm9yIGFueSBldmVudCB0aGF0IGlzIHNwZWNpZmllZC4gVGhpcyBhcnJheSBjYW4gYmUgbWFuaXB1bGF0ZWQsXG4gICAgICogZS5nLiB0byByZW1vdmUgbGlzdGVuZXJzLlxuICAgICAqL1xuICAgIGxpc3RlbmVyc0FueSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FueUxpc3RlbmVycyB8fCBbXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBmaXJlZCB3aGVuIGFueSBldmVudCBpcyBlbWl0dGVkLiBUaGUgZXZlbnQgbmFtZSBpcyBwYXNzZWQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZVxuICAgICAqIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogTm90ZTogYWNrbm93bGVkZ2VtZW50cyBzZW50IHRvIHRoZSBzZXJ2ZXIgYXJlIG5vdCBpbmNsdWRlZC5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogc29ja2V0Lm9uQW55T3V0Z29pbmcoKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhgc2VudCBldmVudCAke2V2ZW50fWApO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICovXG4gICAgb25BbnlPdXRnb2luZyhsaXN0ZW5lcikge1xuICAgICAgICB0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycyA9IHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzIHx8IFtdO1xuICAgICAgICB0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgZmlyZWQgd2hlbiBhbnkgZXZlbnQgaXMgZW1pdHRlZC4gVGhlIGV2ZW50IG5hbWUgaXMgcGFzc2VkIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGVcbiAgICAgKiBjYWxsYmFjay4gVGhlIGxpc3RlbmVyIGlzIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGxpc3RlbmVycyBhcnJheS5cbiAgICAgKlxuICAgICAqIE5vdGU6IGFja25vd2xlZGdlbWVudHMgc2VudCB0byB0aGUgc2VydmVyIGFyZSBub3QgaW5jbHVkZWQuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHNvY2tldC5wcmVwZW5kQW55T3V0Z29pbmcoKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICogICBjb25zb2xlLmxvZyhgc2VudCBldmVudCAke2V2ZW50fWApO1xuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICovXG4gICAgcHJlcGVuZEFueU91dGdvaW5nKGxpc3RlbmVyKSB7XG4gICAgICAgIHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzID0gdGhpcy5fYW55T3V0Z29pbmdMaXN0ZW5lcnMgfHwgW107XG4gICAgICAgIHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGZpcmVkIHdoZW4gYW55IGV2ZW50IGlzIGVtaXR0ZWQuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IGNhdGNoQWxsTGlzdGVuZXIgPSAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgKiAgIGNvbnNvbGUubG9nKGBzZW50IGV2ZW50ICR7ZXZlbnR9YCk7XG4gICAgICogfVxuICAgICAqXG4gICAgICogc29ja2V0Lm9uQW55T3V0Z29pbmcoY2F0Y2hBbGxMaXN0ZW5lcik7XG4gICAgICpcbiAgICAgKiAvLyByZW1vdmUgYSBzcGVjaWZpYyBsaXN0ZW5lclxuICAgICAqIHNvY2tldC5vZmZBbnlPdXRnb2luZyhjYXRjaEFsbExpc3RlbmVyKTtcbiAgICAgKlxuICAgICAqIC8vIG9yIHJlbW92ZSBhbGwgbGlzdGVuZXJzXG4gICAgICogc29ja2V0Lm9mZkFueU91dGdvaW5nKCk7XG4gICAgICpcbiAgICAgKiBAcGFyYW0gW2xpc3RlbmVyXSAtIHRoZSBjYXRjaC1hbGwgbGlzdGVuZXIgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG9mZkFueU91dGdvaW5nKGxpc3RlbmVyKSB7XG4gICAgICAgIGlmICghdGhpcy5fYW55T3V0Z29pbmdMaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsaXN0ZW5lcikge1xuICAgICAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gdGhpcy5fYW55T3V0Z29pbmdMaXN0ZW5lcnM7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lciA9PT0gbGlzdGVuZXJzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIHRoYXQgYXJlIGxpc3RlbmluZyBmb3IgYW55IGV2ZW50IHRoYXQgaXMgc3BlY2lmaWVkLiBUaGlzIGFycmF5IGNhbiBiZSBtYW5pcHVsYXRlZCxcbiAgICAgKiBlLmcuIHRvIHJlbW92ZSBsaXN0ZW5lcnMuXG4gICAgICovXG4gICAgbGlzdGVuZXJzQW55T3V0Z29pbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycyB8fCBbXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTm90aWZ5IHRoZSBsaXN0ZW5lcnMgZm9yIGVhY2ggcGFja2V0IHNlbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYWNrZXRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgbm90aWZ5T3V0Z29pbmdMaXN0ZW5lcnMocGFja2V0KSB7XG4gICAgICAgIGlmICh0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycyAmJiB0aGlzLl9hbnlPdXRnb2luZ0xpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RlbmVycyA9IHRoaXMuX2FueU91dGdvaW5nTGlzdGVuZXJzLnNsaWNlKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIHBhY2tldC5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qKlxuICogSW5pdGlhbGl6ZSBiYWNrb2ZmIHRpbWVyIHdpdGggYG9wdHNgLlxuICpcbiAqIC0gYG1pbmAgaW5pdGlhbCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyBbMTAwXVxuICogLSBgbWF4YCBtYXggdGltZW91dCBbMTAwMDBdXG4gKiAtIGBqaXR0ZXJgIFswXVxuICogLSBgZmFjdG9yYCBbMl1cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0c1xuICogQGFwaSBwdWJsaWNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIEJhY2tvZmYob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIHRoaXMubXMgPSBvcHRzLm1pbiB8fCAxMDA7XG4gICAgdGhpcy5tYXggPSBvcHRzLm1heCB8fCAxMDAwMDtcbiAgICB0aGlzLmZhY3RvciA9IG9wdHMuZmFjdG9yIHx8IDI7XG4gICAgdGhpcy5qaXR0ZXIgPSBvcHRzLmppdHRlciA+IDAgJiYgb3B0cy5qaXR0ZXIgPD0gMSA/IG9wdHMuaml0dGVyIDogMDtcbiAgICB0aGlzLmF0dGVtcHRzID0gMDtcbn1cbi8qKlxuICogUmV0dXJuIHRoZSBiYWNrb2ZmIGR1cmF0aW9uLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbkJhY2tvZmYucHJvdG90eXBlLmR1cmF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBtcyA9IHRoaXMubXMgKiBNYXRoLnBvdyh0aGlzLmZhY3RvciwgdGhpcy5hdHRlbXB0cysrKTtcbiAgICBpZiAodGhpcy5qaXR0ZXIpIHtcbiAgICAgICAgdmFyIHJhbmQgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICB2YXIgZGV2aWF0aW9uID0gTWF0aC5mbG9vcihyYW5kICogdGhpcy5qaXR0ZXIgKiBtcyk7XG4gICAgICAgIG1zID0gKE1hdGguZmxvb3IocmFuZCAqIDEwKSAmIDEpID09IDAgPyBtcyAtIGRldmlhdGlvbiA6IG1zICsgZGV2aWF0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gTWF0aC5taW4obXMsIHRoaXMubWF4KSB8IDA7XG59O1xuLyoqXG4gKiBSZXNldCB0aGUgbnVtYmVyIG9mIGF0dGVtcHRzLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkJhY2tvZmYucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuYXR0ZW1wdHMgPSAwO1xufTtcbi8qKlxuICogU2V0IHRoZSBtaW5pbXVtIGR1cmF0aW9uXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuQmFja29mZi5wcm90b3R5cGUuc2V0TWluID0gZnVuY3Rpb24gKG1pbikge1xuICAgIHRoaXMubXMgPSBtaW47XG59O1xuLyoqXG4gKiBTZXQgdGhlIG1heGltdW0gZHVyYXRpb25cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5CYWNrb2ZmLnByb3RvdHlwZS5zZXRNYXggPSBmdW5jdGlvbiAobWF4KSB7XG4gICAgdGhpcy5tYXggPSBtYXg7XG59O1xuLyoqXG4gKiBTZXQgdGhlIGppdHRlclxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cbkJhY2tvZmYucHJvdG90eXBlLnNldEppdHRlciA9IGZ1bmN0aW9uIChqaXR0ZXIpIHtcbiAgICB0aGlzLmppdHRlciA9IGppdHRlcjtcbn07XG4iLCJpbXBvcnQgeyBTb2NrZXQgYXMgRW5naW5lLCBpbnN0YWxsVGltZXJGdW5jdGlvbnMsIG5leHRUaWNrLCB9IGZyb20gXCJlbmdpbmUuaW8tY2xpZW50XCI7XG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi9zb2NrZXQuanNcIjtcbmltcG9ydCAqIGFzIHBhcnNlciBmcm9tIFwic29ja2V0LmlvLXBhcnNlclwiO1xuaW1wb3J0IHsgb24gfSBmcm9tIFwiLi9vbi5qc1wiO1xuaW1wb3J0IHsgQmFja29mZiB9IGZyb20gXCIuL2NvbnRyaWIvYmFja28yLmpzXCI7XG5pbXBvcnQgeyBFbWl0dGVyLCB9IGZyb20gXCJAc29ja2V0LmlvL2NvbXBvbmVudC1lbWl0dGVyXCI7XG5leHBvcnQgY2xhc3MgTWFuYWdlciBleHRlbmRzIEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yKHVyaSwgb3B0cykge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMubnNwcyA9IHt9O1xuICAgICAgICB0aGlzLnN1YnMgPSBbXTtcbiAgICAgICAgaWYgKHVyaSAmJiBcIm9iamVjdFwiID09PSB0eXBlb2YgdXJpKSB7XG4gICAgICAgICAgICBvcHRzID0gdXJpO1xuICAgICAgICAgICAgdXJpID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgICBvcHRzLnBhdGggPSBvcHRzLnBhdGggfHwgXCIvc29ja2V0LmlvXCI7XG4gICAgICAgIHRoaXMub3B0cyA9IG9wdHM7XG4gICAgICAgIGluc3RhbGxUaW1lckZ1bmN0aW9ucyh0aGlzLCBvcHRzKTtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3Rpb24ob3B0cy5yZWNvbm5lY3Rpb24gIT09IGZhbHNlKTtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3Rpb25BdHRlbXB0cyhvcHRzLnJlY29ubmVjdGlvbkF0dGVtcHRzIHx8IEluZmluaXR5KTtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3Rpb25EZWxheShvcHRzLnJlY29ubmVjdGlvbkRlbGF5IHx8IDEwMDApO1xuICAgICAgICB0aGlzLnJlY29ubmVjdGlvbkRlbGF5TWF4KG9wdHMucmVjb25uZWN0aW9uRGVsYXlNYXggfHwgNTAwMCk7XG4gICAgICAgIHRoaXMucmFuZG9taXphdGlvbkZhY3RvcigoX2EgPSBvcHRzLnJhbmRvbWl6YXRpb25GYWN0b3IpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IDAuNSk7XG4gICAgICAgIHRoaXMuYmFja29mZiA9IG5ldyBCYWNrb2ZmKHtcbiAgICAgICAgICAgIG1pbjogdGhpcy5yZWNvbm5lY3Rpb25EZWxheSgpLFxuICAgICAgICAgICAgbWF4OiB0aGlzLnJlY29ubmVjdGlvbkRlbGF5TWF4KCksXG4gICAgICAgICAgICBqaXR0ZXI6IHRoaXMucmFuZG9taXphdGlvbkZhY3RvcigpLFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy50aW1lb3V0KG51bGwgPT0gb3B0cy50aW1lb3V0ID8gMjAwMDAgOiBvcHRzLnRpbWVvdXQpO1xuICAgICAgICB0aGlzLl9yZWFkeVN0YXRlID0gXCJjbG9zZWRcIjtcbiAgICAgICAgdGhpcy51cmkgPSB1cmk7XG4gICAgICAgIGNvbnN0IF9wYXJzZXIgPSBvcHRzLnBhcnNlciB8fCBwYXJzZXI7XG4gICAgICAgIHRoaXMuZW5jb2RlciA9IG5ldyBfcGFyc2VyLkVuY29kZXIoKTtcbiAgICAgICAgdGhpcy5kZWNvZGVyID0gbmV3IF9wYXJzZXIuRGVjb2RlcigpO1xuICAgICAgICB0aGlzLl9hdXRvQ29ubmVjdCA9IG9wdHMuYXV0b0Nvbm5lY3QgIT09IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5fYXV0b0Nvbm5lY3QpXG4gICAgICAgICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gICAgcmVjb25uZWN0aW9uKHYpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlY29ubmVjdGlvbjtcbiAgICAgICAgdGhpcy5fcmVjb25uZWN0aW9uID0gISF2O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgcmVjb25uZWN0aW9uQXR0ZW1wdHModikge1xuICAgICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlY29ubmVjdGlvbkF0dGVtcHRzO1xuICAgICAgICB0aGlzLl9yZWNvbm5lY3Rpb25BdHRlbXB0cyA9IHY7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZWNvbm5lY3Rpb25EZWxheSh2KSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWNvbm5lY3Rpb25EZWxheTtcbiAgICAgICAgdGhpcy5fcmVjb25uZWN0aW9uRGVsYXkgPSB2O1xuICAgICAgICAoX2EgPSB0aGlzLmJhY2tvZmYpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5zZXRNaW4odik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByYW5kb21pemF0aW9uRmFjdG9yKHYpIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBpZiAodiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbWl6YXRpb25GYWN0b3I7XG4gICAgICAgIHRoaXMuX3JhbmRvbWl6YXRpb25GYWN0b3IgPSB2O1xuICAgICAgICAoX2EgPSB0aGlzLmJhY2tvZmYpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5zZXRKaXR0ZXIodik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZWNvbm5lY3Rpb25EZWxheU1heCh2KSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKHYgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWNvbm5lY3Rpb25EZWxheU1heDtcbiAgICAgICAgdGhpcy5fcmVjb25uZWN0aW9uRGVsYXlNYXggPSB2O1xuICAgICAgICAoX2EgPSB0aGlzLmJhY2tvZmYpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5zZXRNYXgodik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB0aW1lb3V0KHYpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3RpbWVvdXQ7XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSB2O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3RhcnRzIHRyeWluZyB0byByZWNvbm5lY3QgaWYgcmVjb25uZWN0aW9uIGlzIGVuYWJsZWQgYW5kIHdlIGhhdmUgbm90XG4gICAgICogc3RhcnRlZCByZWNvbm5lY3RpbmcgeWV0XG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG1heWJlUmVjb25uZWN0T25PcGVuKCkge1xuICAgICAgICAvLyBPbmx5IHRyeSB0byByZWNvbm5lY3QgaWYgaXQncyB0aGUgZmlyc3QgdGltZSB3ZSdyZSBjb25uZWN0aW5nXG4gICAgICAgIGlmICghdGhpcy5fcmVjb25uZWN0aW5nICYmXG4gICAgICAgICAgICB0aGlzLl9yZWNvbm5lY3Rpb24gJiZcbiAgICAgICAgICAgIHRoaXMuYmFja29mZi5hdHRlbXB0cyA9PT0gMCkge1xuICAgICAgICAgICAgLy8ga2VlcHMgcmVjb25uZWN0aW9uIGZyb20gZmlyaW5nIHR3aWNlIGZvciB0aGUgc2FtZSByZWNvbm5lY3Rpb24gbG9vcFxuICAgICAgICAgICAgdGhpcy5yZWNvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjdXJyZW50IHRyYW5zcG9ydCBgc29ja2V0YC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIC0gb3B0aW9uYWwsIGNhbGxiYWNrXG4gICAgICogQHJldHVybiBzZWxmXG4gICAgICogQHB1YmxpY1xuICAgICAqL1xuICAgIG9wZW4oZm4pIHtcbiAgICAgICAgaWYgKH50aGlzLl9yZWFkeVN0YXRlLmluZGV4T2YoXCJvcGVuXCIpKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIHRoaXMuZW5naW5lID0gbmV3IEVuZ2luZSh0aGlzLnVyaSwgdGhpcy5vcHRzKTtcbiAgICAgICAgY29uc3Qgc29ja2V0ID0gdGhpcy5lbmdpbmU7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLl9yZWFkeVN0YXRlID0gXCJvcGVuaW5nXCI7XG4gICAgICAgIHRoaXMuc2tpcFJlY29ubmVjdCA9IGZhbHNlO1xuICAgICAgICAvLyBlbWl0IGBvcGVuYFxuICAgICAgICBjb25zdCBvcGVuU3ViRGVzdHJveSA9IG9uKHNvY2tldCwgXCJvcGVuXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYub25vcGVuKCk7XG4gICAgICAgICAgICBmbiAmJiBmbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZW1pdCBgZXJyb3JgXG4gICAgICAgIGNvbnN0IGVycm9yU3ViID0gb24oc29ja2V0LCBcImVycm9yXCIsIChlcnIpID0+IHtcbiAgICAgICAgICAgIHNlbGYuY2xlYW51cCgpO1xuICAgICAgICAgICAgc2VsZi5fcmVhZHlTdGF0ZSA9IFwiY2xvc2VkXCI7XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcImVycm9yXCIsIGVycik7XG4gICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBkbyB0aGlzIGlmIHRoZXJlIGlzIG5vIGZuIHRvIGhhbmRsZSB0aGUgZXJyb3JcbiAgICAgICAgICAgICAgICBzZWxmLm1heWJlUmVjb25uZWN0T25PcGVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZmFsc2UgIT09IHRoaXMuX3RpbWVvdXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVvdXQgPSB0aGlzLl90aW1lb3V0O1xuICAgICAgICAgICAgaWYgKHRpbWVvdXQgPT09IDApIHtcbiAgICAgICAgICAgICAgICBvcGVuU3ViRGVzdHJveSgpOyAvLyBwcmV2ZW50cyBhIHJhY2UgY29uZGl0aW9uIHdpdGggdGhlICdvcGVuJyBldmVudFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2V0IHRpbWVyXG4gICAgICAgICAgICBjb25zdCB0aW1lciA9IHRoaXMuc2V0VGltZW91dEZuKCgpID0+IHtcbiAgICAgICAgICAgICAgICBvcGVuU3ViRGVzdHJveSgpO1xuICAgICAgICAgICAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgICBzb2NrZXQuZW1pdChcImVycm9yXCIsIG5ldyBFcnJvcihcInRpbWVvdXRcIikpO1xuICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRzLmF1dG9VbnJlZikge1xuICAgICAgICAgICAgICAgIHRpbWVyLnVucmVmKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN1YnMucHVzaChmdW5jdGlvbiBzdWJEZXN0cm95KCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN1YnMucHVzaChvcGVuU3ViRGVzdHJveSk7XG4gICAgICAgIHRoaXMuc3Vicy5wdXNoKGVycm9yU3ViKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciBvcGVuKClcbiAgICAgKlxuICAgICAqIEByZXR1cm4gc2VsZlxuICAgICAqIEBwdWJsaWNcbiAgICAgKi9cbiAgICBjb25uZWN0KGZuKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wZW4oZm4pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiB0cmFuc3BvcnQgb3Blbi5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25vcGVuKCkge1xuICAgICAgICAvLyBjbGVhciBvbGQgc3Vic1xuICAgICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICAgICAgLy8gbWFyayBhcyBvcGVuXG4gICAgICAgIHRoaXMuX3JlYWR5U3RhdGUgPSBcIm9wZW5cIjtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJvcGVuXCIpO1xuICAgICAgICAvLyBhZGQgbmV3IHN1YnNcbiAgICAgICAgY29uc3Qgc29ja2V0ID0gdGhpcy5lbmdpbmU7XG4gICAgICAgIHRoaXMuc3Vicy5wdXNoKG9uKHNvY2tldCwgXCJwaW5nXCIsIHRoaXMub25waW5nLmJpbmQodGhpcykpLCBvbihzb2NrZXQsIFwiZGF0YVwiLCB0aGlzLm9uZGF0YS5iaW5kKHRoaXMpKSwgb24oc29ja2V0LCBcImVycm9yXCIsIHRoaXMub25lcnJvci5iaW5kKHRoaXMpKSwgb24oc29ja2V0LCBcImNsb3NlXCIsIHRoaXMub25jbG9zZS5iaW5kKHRoaXMpKSwgb24odGhpcy5kZWNvZGVyLCBcImRlY29kZWRcIiwgdGhpcy5vbmRlY29kZWQuYmluZCh0aGlzKSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgdXBvbiBhIHBpbmcuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9ucGluZygpIHtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJwaW5nXCIpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2l0aCBkYXRhLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbmRhdGEoZGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5kZWNvZGVyLmFkZChkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbmNsb3NlKFwicGFyc2UgZXJyb3JcIiwgZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gcGFyc2VyIGZ1bGx5IGRlY29kZXMgYSBwYWNrZXQuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIG9uZGVjb2RlZChwYWNrZXQpIHtcbiAgICAgICAgLy8gdGhlIG5leHRUaWNrIGNhbGwgcHJldmVudHMgYW4gZXhjZXB0aW9uIGluIGEgdXNlci1wcm92aWRlZCBldmVudCBsaXN0ZW5lciBmcm9tIHRyaWdnZXJpbmcgYSBkaXNjb25uZWN0aW9uIGR1ZSB0byBhIFwicGFyc2UgZXJyb3JcIlxuICAgICAgICBuZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcInBhY2tldFwiLCBwYWNrZXQpO1xuICAgICAgICB9LCB0aGlzLnNldFRpbWVvdXRGbik7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIHNvY2tldCBlcnJvci5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgb25lcnJvcihlcnIpIHtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJlcnJvclwiLCBlcnIpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHNvY2tldCBmb3IgdGhlIGdpdmVuIGBuc3BgLlxuICAgICAqXG4gICAgICogQHJldHVybiB7U29ja2V0fVxuICAgICAqIEBwdWJsaWNcbiAgICAgKi9cbiAgICBzb2NrZXQobnNwLCBvcHRzKSB7XG4gICAgICAgIGxldCBzb2NrZXQgPSB0aGlzLm5zcHNbbnNwXTtcbiAgICAgICAgaWYgKCFzb2NrZXQpIHtcbiAgICAgICAgICAgIHNvY2tldCA9IG5ldyBTb2NrZXQodGhpcywgbnNwLCBvcHRzKTtcbiAgICAgICAgICAgIHRoaXMubnNwc1tuc3BdID0gc29ja2V0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuX2F1dG9Db25uZWN0ICYmICFzb2NrZXQuYWN0aXZlKSB7XG4gICAgICAgICAgICBzb2NrZXQuY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb2NrZXQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIGEgc29ja2V0IGNsb3NlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHNvY2tldFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2Rlc3Ryb3koc29ja2V0KSB7XG4gICAgICAgIGNvbnN0IG5zcHMgPSBPYmplY3Qua2V5cyh0aGlzLm5zcHMpO1xuICAgICAgICBmb3IgKGNvbnN0IG5zcCBvZiBuc3BzKSB7XG4gICAgICAgICAgICBjb25zdCBzb2NrZXQgPSB0aGlzLm5zcHNbbnNwXTtcbiAgICAgICAgICAgIGlmIChzb2NrZXQuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Nsb3NlKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyaXRlcyBhIHBhY2tldC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYWNrZXRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9wYWNrZXQocGFja2V0KSB7XG4gICAgICAgIGNvbnN0IGVuY29kZWRQYWNrZXRzID0gdGhpcy5lbmNvZGVyLmVuY29kZShwYWNrZXQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVuY29kZWRQYWNrZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS53cml0ZShlbmNvZGVkUGFja2V0c1tpXSwgcGFja2V0Lm9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHRyYW5zcG9ydCBzdWJzY3JpcHRpb25zIGFuZCBwYWNrZXQgYnVmZmVyLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBjbGVhbnVwKCkge1xuICAgICAgICB0aGlzLnN1YnMuZm9yRWFjaCgoc3ViRGVzdHJveSkgPT4gc3ViRGVzdHJveSgpKTtcbiAgICAgICAgdGhpcy5zdWJzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuZGVjb2Rlci5kZXN0cm95KCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlIHRoZSBjdXJyZW50IHNvY2tldC5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2Nsb3NlKCkge1xuICAgICAgICB0aGlzLnNraXBSZWNvbm5lY3QgPSB0cnVlO1xuICAgICAgICB0aGlzLl9yZWNvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5vbmNsb3NlKFwiZm9yY2VkIGNsb3NlXCIpO1xuICAgICAgICBpZiAodGhpcy5lbmdpbmUpXG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5jbG9zZSgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBbGlhcyBmb3IgY2xvc2UoKVxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBkaXNjb25uZWN0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2xvc2UoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHVwb24gZW5naW5lIGNsb3NlLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbmNsb3NlKHJlYXNvbiwgZGVzY3JpcHRpb24pIHtcbiAgICAgICAgdGhpcy5jbGVhbnVwKCk7XG4gICAgICAgIHRoaXMuYmFja29mZi5yZXNldCgpO1xuICAgICAgICB0aGlzLl9yZWFkeVN0YXRlID0gXCJjbG9zZWRcIjtcbiAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJjbG9zZVwiLCByZWFzb24sIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgaWYgKHRoaXMuX3JlY29ubmVjdGlvbiAmJiAhdGhpcy5za2lwUmVjb25uZWN0KSB7XG4gICAgICAgICAgICB0aGlzLnJlY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEF0dGVtcHQgYSByZWNvbm5lY3Rpb24uXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHJlY29ubmVjdCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3JlY29ubmVjdGluZyB8fCB0aGlzLnNraXBSZWNvbm5lY3QpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGlmICh0aGlzLmJhY2tvZmYuYXR0ZW1wdHMgPj0gdGhpcy5fcmVjb25uZWN0aW9uQXR0ZW1wdHMpIHtcbiAgICAgICAgICAgIHRoaXMuYmFja29mZi5yZXNldCgpO1xuICAgICAgICAgICAgdGhpcy5lbWl0UmVzZXJ2ZWQoXCJyZWNvbm5lY3RfZmFpbGVkXCIpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25uZWN0aW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWxheSA9IHRoaXMuYmFja29mZi5kdXJhdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5fcmVjb25uZWN0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5zZXRUaW1lb3V0Rm4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLnNraXBSZWNvbm5lY3QpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcInJlY29ubmVjdF9hdHRlbXB0XCIsIHNlbGYuYmFja29mZi5hdHRlbXB0cyk7XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgYWdhaW4gZm9yIHRoZSBjYXNlIHNvY2tldCBjbG9zZWQgaW4gYWJvdmUgZXZlbnRzXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuc2tpcFJlY29ubmVjdClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHNlbGYub3BlbigoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlY29ubmVjdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWNvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdFJlc2VydmVkKFwicmVjb25uZWN0X2Vycm9yXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLm9ucmVjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGRlbGF5KTtcbiAgICAgICAgICAgIGlmICh0aGlzLm9wdHMuYXV0b1VucmVmKSB7XG4gICAgICAgICAgICAgICAgdGltZXIudW5yZWYoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3Vicy5wdXNoKGZ1bmN0aW9uIHN1YkRlc3Ryb3koKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGxlZCB1cG9uIHN1Y2Nlc3NmdWwgcmVjb25uZWN0LlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBvbnJlY29ubmVjdCgpIHtcbiAgICAgICAgY29uc3QgYXR0ZW1wdCA9IHRoaXMuYmFja29mZi5hdHRlbXB0cztcbiAgICAgICAgdGhpcy5fcmVjb25uZWN0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuYmFja29mZi5yZXNldCgpO1xuICAgICAgICB0aGlzLmVtaXRSZXNlcnZlZChcInJlY29ubmVjdFwiLCBhdHRlbXB0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1cmwgfSBmcm9tIFwiLi91cmwuanNcIjtcbmltcG9ydCB7IE1hbmFnZXIgfSBmcm9tIFwiLi9tYW5hZ2VyLmpzXCI7XG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tIFwiLi9zb2NrZXQuanNcIjtcbi8qKlxuICogTWFuYWdlcnMgY2FjaGUuXG4gKi9cbmNvbnN0IGNhY2hlID0ge307XG5mdW5jdGlvbiBsb29rdXAodXJpLCBvcHRzKSB7XG4gICAgaWYgKHR5cGVvZiB1cmkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgb3B0cyA9IHVyaTtcbiAgICAgICAgdXJpID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICBjb25zdCBwYXJzZWQgPSB1cmwodXJpLCBvcHRzLnBhdGggfHwgXCIvc29ja2V0LmlvXCIpO1xuICAgIGNvbnN0IHNvdXJjZSA9IHBhcnNlZC5zb3VyY2U7XG4gICAgY29uc3QgaWQgPSBwYXJzZWQuaWQ7XG4gICAgY29uc3QgcGF0aCA9IHBhcnNlZC5wYXRoO1xuICAgIGNvbnN0IHNhbWVOYW1lc3BhY2UgPSBjYWNoZVtpZF0gJiYgcGF0aCBpbiBjYWNoZVtpZF1bXCJuc3BzXCJdO1xuICAgIGNvbnN0IG5ld0Nvbm5lY3Rpb24gPSBvcHRzLmZvcmNlTmV3IHx8XG4gICAgICAgIG9wdHNbXCJmb3JjZSBuZXcgY29ubmVjdGlvblwiXSB8fFxuICAgICAgICBmYWxzZSA9PT0gb3B0cy5tdWx0aXBsZXggfHxcbiAgICAgICAgc2FtZU5hbWVzcGFjZTtcbiAgICBsZXQgaW87XG4gICAgaWYgKG5ld0Nvbm5lY3Rpb24pIHtcbiAgICAgICAgaW8gPSBuZXcgTWFuYWdlcihzb3VyY2UsIG9wdHMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKCFjYWNoZVtpZF0pIHtcbiAgICAgICAgICAgIGNhY2hlW2lkXSA9IG5ldyBNYW5hZ2VyKHNvdXJjZSwgb3B0cyk7XG4gICAgICAgIH1cbiAgICAgICAgaW8gPSBjYWNoZVtpZF07XG4gICAgfVxuICAgIGlmIChwYXJzZWQucXVlcnkgJiYgIW9wdHMucXVlcnkpIHtcbiAgICAgICAgb3B0cy5xdWVyeSA9IHBhcnNlZC5xdWVyeUtleTtcbiAgICB9XG4gICAgcmV0dXJuIGlvLnNvY2tldChwYXJzZWQucGF0aCwgb3B0cyk7XG59XG4vLyBzbyB0aGF0IFwibG9va3VwXCIgY2FuIGJlIHVzZWQgYm90aCBhcyBhIGZ1bmN0aW9uIChlLmcuIGBpbyguLi4pYCkgYW5kIGFzIGFcbi8vIG5hbWVzcGFjZSAoZS5nLiBgaW8uY29ubmVjdCguLi4pYCksIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG5PYmplY3QuYXNzaWduKGxvb2t1cCwge1xuICAgIE1hbmFnZXIsXG4gICAgU29ja2V0LFxuICAgIGlvOiBsb29rdXAsXG4gICAgY29ubmVjdDogbG9va3VwLFxufSk7XG4vKipcbiAqIFByb3RvY29sIHZlcnNpb24uXG4gKlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgeyBwcm90b2NvbCB9IGZyb20gXCJzb2NrZXQuaW8tcGFyc2VyXCI7XG4vKipcbiAqIEV4cG9zZSBjb25zdHJ1Y3RvcnMgZm9yIHN0YW5kYWxvbmUgYnVpbGQuXG4gKlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgeyBNYW5hZ2VyLCBTb2NrZXQsIGxvb2t1cCBhcyBpbywgbG9va3VwIGFzIGNvbm5lY3QsIGxvb2t1cCBhcyBkZWZhdWx0LCB9O1xuIiwiLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4vLyBUaW1lciBjbGFzcyBtb2R1bGVcclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuLy8gVGltZXIgY2xhc3MgY29uc3RydWN0b3IgZnVuY3Rpb25cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4vLyBUaW1lciBjbGFzcyBtb2R1bGVcclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4vLyBUaW1lciBjbGFzcyBjb25zdHJ1Y3RvciBmdW5jdGlvblxyXG5leHBvcnQgY2xhc3MgVGltZXIge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgLy8gVGltZXIgb2J0YWluIGN1cnJlbnQgdGltZSBpbiBzZWNvbmRzIG1ldGhvZFxyXG4gICAgY29uc3QgZ2V0VGltZSA9ICgpID0+IHtcclxuICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGxldCB0ID1cclxuICAgICAgICBkYXRlLmdldE1pbGxpc2Vjb25kcygpIC8gMTAwMC4wICtcclxuICAgICAgICBkYXRlLmdldFNlY29uZHMoKSArXHJcbiAgICAgICAgZGF0ZS5nZXRNaW51dGVzKCkgKiA2MDtcclxuICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFRpbWVyIHJlc3BvbnNlIG1ldGhvZFxyXG4gICAgdGhpcy5yZXNwb25zZSA9ICh0YWdfaWQgPSBudWxsKSA9PiB7XHJcbiAgICAgIGxldCB0ID0gZ2V0VGltZSgpO1xyXG4gICAgICAvLyBHbG9iYWwgdGltZVxyXG4gICAgICB0aGlzLmdsb2JhbFRpbWUgPSB0O1xyXG4gICAgICB0aGlzLmdsb2JhbERlbHRhVGltZSA9IHQgLSB0aGlzLm9sZFRpbWU7XHJcbiAgICAgIC8vIFRpbWUgd2l0aCBwYXVzZVxyXG4gICAgICBpZiAodGhpcy5pc1BhdXNlKSB7XHJcbiAgICAgICAgdGhpcy5sb2NhbERlbHRhVGltZSA9IDA7XHJcbiAgICAgICAgdGhpcy5wYXVzZVRpbWUgKz0gdCAtIHRoaXMub2xkVGltZTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmxvY2FsRGVsdGFUaW1lID0gdGhpcy5nbG9iYWxEZWx0YVRpbWU7XHJcbiAgICAgICAgdGhpcy5sb2NhbFRpbWUgPSB0IC0gdGhpcy5wYXVzZVRpbWUgLSB0aGlzLnN0YXJ0VGltZTtcclxuICAgICAgfVxyXG4gICAgICAvLyBGUFNcclxuICAgICAgdGhpcy5mcmFtZUNvdW50ZXIrKztcclxuICAgICAgaWYgKHQgLSB0aGlzLm9sZFRpbWVGUFMgPiAzKSB7XHJcbiAgICAgICAgdGhpcy5GUFMgPSB0aGlzLmZyYW1lQ291bnRlciAvICh0IC0gdGhpcy5vbGRUaW1lRlBTKTtcclxuICAgICAgICB0aGlzLm9sZFRpbWVGUFMgPSB0O1xyXG4gICAgICAgIHRoaXMuZnJhbWVDb3VudGVyID0gMDtcclxuICAgICAgICBpZiAodGFnX2lkICE9IG51bGwpXHJcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0YWdfaWQpLmlubmVySFRNTCA9IHRoaXMuZ2V0RlBTKCk7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5vbGRUaW1lID0gdDtcclxuICAgIH07XHJcblxyXG4gICAgLy8gT2J0YWluIEZQUyBhcyBzdHJpbmcgbWV0aG9kXHJcbiAgICB0aGlzLmdldEZQUyA9ICgpID0+IHRoaXMuRlBTLnRvRml4ZWQoMyk7XHJcblxyXG4gICAgLy8gRmlsbCB0aW1lciBnbG9iYWwgZGF0YVxyXG4gICAgdGhpcy5nbG9iYWxUaW1lID0gdGhpcy5sb2NhbFRpbWUgPSBnZXRUaW1lKCk7XHJcbiAgICB0aGlzLmdsb2JhbERlbHRhVGltZSA9IHRoaXMubG9jYWxEZWx0YVRpbWUgPSAwO1xyXG5cclxuICAgIC8vIEZpbGwgdGltZXIgc2VtaSBnbG9iYWwgZGF0YVxyXG4gICAgdGhpcy5zdGFydFRpbWUgPSB0aGlzLm9sZFRpbWUgPSB0aGlzLm9sZFRpbWVGUFMgPSB0aGlzLmdsb2JhbFRpbWU7XHJcbiAgICB0aGlzLmZyYW1lQ291bnRlciA9IDA7XHJcbiAgICB0aGlzLmlzUGF1c2UgPSBmYWxzZTtcclxuICAgIHRoaXMuRlBTID0gMzAuMDtcclxuICAgIHRoaXMucGF1c2VUaW1lID0gMDtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn0gLy8gRW5kIG9mICdUaW1lcicgZnVuY3Rpb25cclxuIiwiLy8gTWF0aCBpbXBsZW1lbnRhdGlvbnMgZmlsZVxyXG5cclxuLyoqKlxyXG4gKiBWZWN0b3JzXHJcbiAqKiovXHJcblxyXG4vLyAzRCB2ZWN0b3IgY2xhc3NcclxuY2xhc3MgX3ZlYzMge1xyXG4gICAgLy8gU2V0IHZlY3RvclxyXG4gICAgY29uc3RydWN0b3IoeCwgeSwgeikge1xyXG4gICAgICAgIGlmICh4ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAodGhpcy54ID0gMCksICh0aGlzLnkgPSAwKSwgKHRoaXMueiA9IDApO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHggPT0gXCJvYmplY3RcIikge1xyXG4gICAgICAgICAgICBpZiAoeC5sZW5ndGggPT0gMykge1xyXG4gICAgICAgICAgICAgICAgKHRoaXMueCA9IHhbMF0pLCAodGhpcy55ID0geFsxXSksICh0aGlzLnogPSB4WzJdKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICh0aGlzLnggPSB4LngpLCAodGhpcy55ID0geC55KSwgKHRoaXMueiA9IHgueik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoeSA9PSB1bmRlZmluZWQgJiYgeiA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICh0aGlzLnggPSB4KSwgKHRoaXMueSA9IHgpLCAodGhpcy56ID0geCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAodGhpcy54ID0geCksICh0aGlzLnkgPSB5KSwgKHRoaXMueiA9IHopO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldCh4LCB5LCB6KSB7XHJcbiAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geSksICh0aGlzLnogPSB6KTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgdHdvIHZlY3RvcnMgZnVuY3Rpb25cclxuICAgIGFkZCh2ZWMpIHtcclxuICAgICAgICByZXR1cm4gdmVjMyh0aGlzLnggKyB2ZWMueCwgdGhpcy55ICsgdmVjLnksIHRoaXMueiArIHZlYy56KTtcclxuICAgIH1cclxuICAgIC8vIFN1YnRyYWN0IHR3byB2ZWN0b3JzIGZ1bmN0aW9uXHJcbiAgICBzdWIodmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHZlYzModGhpcy54IC0gdmVjLngsIHRoaXMueSAtIHZlYy55LCB0aGlzLnogLSB2ZWMueik7XHJcbiAgICB9XHJcbiAgICAvLyBNdWx0aXBseSBmdW5jdGlvblxyXG4gICAgbXVsKHYpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHYgPT0gXCJudW1iZXJcIilcclxuICAgICAgICAgICAgcmV0dXJuIHZlYzModGhpcy54ICogdiwgdGhpcy55ICogdiwgdGhpcy56ICogdik7XHJcbiAgICAgICAgcmV0dXJuIHZlYzModGhpcy54ICogdi54LCB0aGlzLnkgKiB2LnksIHRoaXMueiAqIHYueik7XHJcbiAgICB9XHJcbiAgICAvLyBEaXZpZGUgZnVuY3Rpb25cclxuICAgIGRpdih2KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgaWYgKHYgPT0gMCkgYWxlcnQoXCJEaXZpc2lvbiBieSB6ZXJvIVwiKTtcclxuICAgICAgICAgICAgaWYgKHYgPT0gMSkgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIHJldHVybiB2ZWMzKHRoaXMueCAvIHYsIHRoaXMueSAvIHYsIHRoaXMueiAvIHYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmVjMyh0aGlzLnggLyB2LngsIHRoaXMueSAvIHYueSwgdGhpcy56IC8gdi56KTtcclxuICAgIH1cclxuICAgIC8vIE5lZ2F0ZSB2ZWN0aXIgZnVuY3Rpb25cclxuICAgIG5lZygpIHtcclxuICAgICAgICByZXR1cm4gdmVjMygtdGhpcy54LCAtdGhpcy55LCAtdGhpcy56KTtcclxuICAgIH1cclxuICAgIC8vIFR3byB2ZWN0b3JzIGRvdCBwcm9kdWN0IGZ1bmN0aW9uXHJcbiAgICBkb3QodmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIHZlYy54ICsgdGhpcy55ICogdmVjLnkgKyB0aGlzLnogKiB2ZWMuejtcclxuICAgIH1cclxuICAgIC8vIFR3byB2ZWN0b3JzIGNyb3NzIHByb2R1Y3QgZnVuY3Rpb25cclxuICAgIGNyb3NzKHZlYykge1xyXG4gICAgICAgIHJldHVybiB2ZWMzKFxyXG4gICAgICAgICAgICB0aGlzLnkgKiB2ZWMueiAtIHRoaXMueiAqIHZlYy55LFxyXG4gICAgICAgICAgICB0aGlzLnogKiB2ZWMueCAtIHRoaXMueCAqIHZlYy56LFxyXG4gICAgICAgICAgICB0aGlzLnggKiB2ZWMueSAtIHRoaXMueSAqIHZlYy54XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuICAgIC8vIEdldCBsZW5ndGggb2YgdmVjdG9yIGZ1bmN0aW9uXHJcbiAgICBsZW5ndGgoKSB7XHJcbiAgICAgICAgbGV0IGxlbiA9IHRoaXMuZG90KHRoaXMpO1xyXG5cclxuICAgICAgICBpZiAobGVuID09IDEgfHwgbGVuID09IDApIHJldHVybiBsZW47XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydChsZW4pO1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGxlbmd0aCAqIGxlbmd0aCBvZiB2ZWN0b3IgZnVuY3Rpb25cclxuICAgIGxlbmd0aDIoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpO1xyXG4gICAgfVxyXG4gICAgLy8gTm9ybWFsaXplIHZlY3RvciBmdW5jdGlvblxyXG4gICAgbm9ybWFsaXplKCkge1xyXG4gICAgICAgIGxldCBsZW4gPSB0aGlzLmRvdCh0aGlzKTtcclxuXHJcbiAgICAgICAgaWYgKGxlbiA9PSAxIHx8IGxlbiA9PSAwKSByZXR1cm4gdGhpcztcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXYoTWF0aC5zcXJ0KGxlbikpO1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGFycmF5IGZyb20gdmVjM1xyXG4gICAgdG9BcnJheSgpIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnpdO1xyXG4gICAgfVxyXG4gICAgLy8gVHJhbnNmb3JtIHBvaW50IG9mIHZlY3RvciBmdW5jdGlvblxyXG4gICAgcG9pbnRUcmFuc2Zvcm0obWF0KSB7XHJcbiAgICAgICAgcmV0dXJuIHZlYzMoXHJcbiAgICAgICAgICAgIHRoaXMueCAqIG1hdC5tWzBdWzBdICtcclxuICAgICAgICAgICAgICAgIHRoaXMueSAqIG1hdC5tWzFdWzBdICtcclxuICAgICAgICAgICAgICAgIHRoaXMueiAqIG1hdC5tWzJdWzBdICtcclxuICAgICAgICAgICAgICAgIG1hdC5tWzNdWzBdLFxyXG4gICAgICAgICAgICB0aGlzLnggKiBtYXQubVswXVsxXSArXHJcbiAgICAgICAgICAgICAgICB0aGlzLnkgKiBtYXQubVsxXVsxXSArXHJcbiAgICAgICAgICAgICAgICB0aGlzLnogKiBtYXQubVsyXVsxXSArXHJcbiAgICAgICAgICAgICAgICBtYXQubVszXVsxXSxcclxuICAgICAgICAgICAgdGhpcy54ICogbWF0Lm1bMF1bMl0gK1xyXG4gICAgICAgICAgICAgICAgdGhpcy55ICogbWF0Lm1bMV1bMl0gK1xyXG4gICAgICAgICAgICAgICAgdGhpcy56ICogbWF0Lm1bMl1bMl0gK1xyXG4gICAgICAgICAgICAgICAgbWF0Lm1bM11bMl1cclxuICAgICAgICApO1xyXG4gICAgfVxyXG4gICAgLy8gVmVjdG9yIHRyYW5zZm9ybSBmdW5jdGlvblxyXG4gICAgdHJhbnNmb3JtKG1hdCkge1xyXG4gICAgICAgIHJldHVybiB2ZWMzKFxyXG4gICAgICAgICAgICB0aGlzLnggKiBtYXQubVswXVswXSArIHRoaXMueSAqIG1hdC5tWzFdWzBdICsgdGhpcy56ICogbWF0Lm1bMl1bMF0sXHJcbiAgICAgICAgICAgIHRoaXMueCAqIG1hdC5tWzBdWzFdICsgdGhpcy55ICogbWF0Lm1bMV1bMV0gKyB0aGlzLnogKiBtYXQubVsyXVsxXSxcclxuICAgICAgICAgICAgdGhpcy54ICogbWF0Lm1bMF1bMl0gKyB0aGlzLnkgKiBtYXQubVsxXVsyXSArIHRoaXMueiAqIG1hdC5tWzJdWzJdXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuICAgIC8vIFZlY3RvciBieSBtYXRyaXggbXVsdGlwbGljYXRpb24gZnVuY3Rpb25cclxuICAgIG11bE1hdHIobWF0KSB7XHJcbiAgICAgICAgbGV0IHcgPVxyXG4gICAgICAgICAgICB0aGlzLnggKiBtYXQubVswXVszXSArXHJcbiAgICAgICAgICAgIHRoaXMueSAqIG1hdC5tWzFdWzNdICtcclxuICAgICAgICAgICAgdGhpcy56ICogbWF0Lm1bMl1bM10gK1xyXG4gICAgICAgICAgICBtYXQubVszXVszXTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHZlYzMoXHJcbiAgICAgICAgICAgICh0aGlzLnggKiBtYXQubVswXVswXSArXHJcbiAgICAgICAgICAgICAgICB0aGlzLnkgKiBtYXQubVsxXVswXSArXHJcbiAgICAgICAgICAgICAgICB0aGlzLnogKiBtYXQubVsyXVswXSArXHJcbiAgICAgICAgICAgICAgICBtYXQubVszXVswXSkgL1xyXG4gICAgICAgICAgICAgICAgdyxcclxuICAgICAgICAgICAgKHRoaXMueCAqIG1hdC5tWzBdWzFdICtcclxuICAgICAgICAgICAgICAgIHRoaXMueSAqIG1hdC5tWzFdWzFdICtcclxuICAgICAgICAgICAgICAgIHRoaXMueiAqIG1hdC5tWzJdWzFdICtcclxuICAgICAgICAgICAgICAgIG1hdC5tWzNdWzFdKSAvXHJcbiAgICAgICAgICAgICAgICB3LFxyXG4gICAgICAgICAgICAodGhpcy54ICogbWF0Lm1bMF1bMl0gK1xyXG4gICAgICAgICAgICAgICAgdGhpcy55ICogbWF0Lm1bMV1bMl0gK1xyXG4gICAgICAgICAgICAgICAgdGhpcy56ICogbWF0Lm1bMl1bMl0gK1xyXG4gICAgICAgICAgICAgICAgbWF0Lm1bM11bMl0pIC9cclxuICAgICAgICAgICAgICAgIHdcclxuICAgICAgICApO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB2ZWMzKC4uLmFyZ3MpIHtcclxuICAgIHJldHVybiBuZXcgX3ZlYzMoLi4uYXJncyk7XHJcbn1cclxuIiwiLy8gTWF0aCBpbXBsZW1lbnRhdGlvbnMgZmlsZVxyXG5cclxuLyoqKlxyXG4gKiBWZWN0b3JzXHJcbiAqKiovXHJcblxyXG4vLyAzRCB2ZWN0b3IgY2xhc3NcclxuY2xhc3MgX3ZlYzIge1xyXG4gICAgLy8gU2V0IHZlY3RvclxyXG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xyXG4gICAgICAgIGlmICh4ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAodGhpcy54ID0gMCksICh0aGlzLnkgPSAwKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB4ID09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgaWYgKHgubGVuZ3RoID09IDIpIHtcclxuICAgICAgICAgICAgICAgICh0aGlzLnggPSB4WzBdKSwgKHRoaXMueSA9IHhbMV0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgKHRoaXMueCA9IHgueCksICh0aGlzLnkgPSB4LnkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAodGhpcy54ID0geCksICh0aGlzLnkgPSB4KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICh0aGlzLnggPSB4KSwgKHRoaXMueSA9IHkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldCh4LCB5KSB7XHJcbiAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHR3byB2ZWN0b3JzIGZ1bmN0aW9uXHJcbiAgICBhZGQodmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHZlYzIodGhpcy54ICsgdmVjLngsIHRoaXMueSArIHZlYy55KTtcclxuICAgIH1cclxuICAgIC8vIFN1YnRyYWN0IHR3byB2ZWN0b3JzIGZ1bmN0aW9uXHJcbiAgICBzdWIodmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHZlYzIodGhpcy54IC0gdmVjLngsIHRoaXMueSAtIHZlYy55KTtcclxuICAgIH1cclxuICAgIC8vIE11bHRpcGx5IGZ1bmN0aW9uXHJcbiAgICBtdWwodikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdiA9PSBcIm51bWJlclwiKSByZXR1cm4gdmVjMih0aGlzLnggKiB2LCB0aGlzLnkgKiB2KTtcclxuICAgICAgICByZXR1cm4gdmVjMih0aGlzLnggKiB2LngsIHRoaXMueSAqIHYueSk7XHJcbiAgICB9XHJcbiAgICAvLyBEaXZpZGUgZnVuY3Rpb25cclxuICAgIGRpdih2KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgICAgaWYgKHYgPT0gMCkgYWxlcnQoXCJEaXZpc2lvbiBieSB6ZXJvIVwiKTtcclxuICAgICAgICAgICAgaWYgKHYgPT0gMSkgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIHJldHVybiB2ZWMyKHRoaXMueCAvIHYsIHRoaXMueSAvIHYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmVjMih0aGlzLnggLyB2LngsIHRoaXMueSAvIHYueSk7XHJcbiAgICB9XHJcbiAgICAvLyBUd28gdmVjdG9ycyBkb3QgcHJvZHVjdCBmdW5jdGlvblxyXG4gICAgZG90KHZlYykge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiB2ZWMueCArIHRoaXMueSAqIHZlYy55O1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGxlbmd0aCBvZiB2ZWN0b3IgZnVuY3Rpb25cclxuICAgIGxlbmd0aCgpIHtcclxuICAgICAgICBsZXQgbGVuID0gdGhpcy5kb3QodGhpcyk7XHJcblxyXG4gICAgICAgIGlmIChsZW4gPT0gMSB8fCBsZW4gPT0gMCkgcmV0dXJuIGxlbjtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KGxlbik7XHJcbiAgICB9XHJcbiAgICAvLyBHZXQgbGVuZ3RoICogbGVuZ3RoIG9mIHZlY3RvciBmdW5jdGlvblxyXG4gICAgbGVuZ3RoMigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5kb3QodGhpcyk7XHJcbiAgICB9XHJcbiAgICAvLyBOb3JtYWxpemUgdmVjdG9yIGZ1bmN0aW9uXHJcbiAgICBub3JtYWxpemUoKSB7XHJcbiAgICAgICAgbGV0IGxlbiA9IHRoaXMuZG90KHRoaXMpO1xyXG5cclxuICAgICAgICBpZiAobGVuID09IDEgfHwgbGVuID09IDApIHJldHVybiB0aGlzO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRpdihNYXRoLnNxcnQobGVuKSk7XHJcbiAgICB9XHJcbiAgICAvLyBHZXQgYXJyYXkgZnJvbSB2ZWMyXHJcbiAgICB0b0FycmF5KCkge1xyXG4gICAgICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB2ZWMyKC4uLmFyZ3MpIHtcclxuICAgIHJldHVybiBuZXcgX3ZlYzIoLi4uYXJncyk7XHJcbn1cclxuIiwiLy8gTWF0aCBpbXBsZW1lbnRhdGlvbnMgZmlsZVxyXG5cclxuLyoqKlxyXG4gKiBWZWN0b3JzXHJcbiAqKiovXHJcblxyXG4vLyA0RCB2ZWN0b3IgY2xhc3NcclxuY2xhc3MgX3ZlYzQge1xyXG4gICAgLy8gU2V0IHZlY3RvclxyXG4gICAgY29uc3RydWN0b3IoeCwgeSwgeiwgdykge1xyXG4gICAgICAgIGlmICh4ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAodGhpcy54ID0gMCksICh0aGlzLnkgPSAwKSwgKHRoaXMueiA9IDApLCAodGhpcy53ID0gMCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgeCA9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgIGlmICh4Lmxlbmd0aCA9PSA0KSB7XHJcbiAgICAgICAgICAgICAgICAodGhpcy54ID0geFswXSksXHJcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMueSA9IHhbMV0pLFxyXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnogPSB4WzJdKSxcclxuICAgICAgICAgICAgICAgICAgICAodGhpcy53ID0geFszXSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAodGhpcy54ID0geC54KSwgKHRoaXMueSA9IHgueSksICh0aGlzLnogPSB4LnopLCAodGhpcy53ID0geC53KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh5ID09IHVuZGVmaW5lZCAmJiB6ID09IHVuZGVmaW5lZCAmJiB3ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geCksICh0aGlzLnogPSB4KSwgKHRoaXMudyA9IHgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geSksICh0aGlzLnogPSB6KSwgKHRoaXMudyA9IHcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldCh4LCB5LCB6LCB3KSB7XHJcbiAgICAgICAgKHRoaXMueCA9IHgpLCAodGhpcy55ID0geSksICh0aGlzLnogPSB6KSwgKHRoaXMudyA9IHcpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCB0d28gdmVjdG9ycyBmdW5jdGlvblxyXG4gICAgYWRkKHZlYykge1xyXG4gICAgICAgIHJldHVybiB2ZWM0KFxyXG4gICAgICAgICAgICB0aGlzLnggKyB2ZWMueCxcclxuICAgICAgICAgICAgdGhpcy55ICsgdmVjLnksXHJcbiAgICAgICAgICAgIHRoaXMueiArIHZlYy56LFxyXG4gICAgICAgICAgICB0aGlzLncgKyB2ZWMud1xyXG4gICAgICAgICk7XHJcbiAgICB9XHJcbiAgICAvLyBTdWJ0cmFjdCB0d28gdmVjdG9ycyBmdW5jdGlvblxyXG4gICAgc3ViKHZlYykge1xyXG4gICAgICAgIHJldHVybiB2ZWM0KFxyXG4gICAgICAgICAgICB0aGlzLnggLSB2ZWMueCxcclxuICAgICAgICAgICAgdGhpcy55IC0gdmVjLnksXHJcbiAgICAgICAgICAgIHRoaXMueiAtIHZlYy56LFxyXG4gICAgICAgICAgICB0aGlzLncgLSB2ZWMud1xyXG4gICAgICAgICk7XHJcbiAgICB9XHJcbiAgICAvLyBNdWx0aXBseSBmdW5jdGlvblxyXG4gICAgbXVsKHYpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHYgPT0gXCJudW1iZXJcIilcclxuICAgICAgICAgICAgcmV0dXJuIHZlYzQodGhpcy54ICogdiwgdGhpcy55ICogdiwgdGhpcy56ICogdiwgdGhpcy53ICogdik7XHJcbiAgICAgICAgcmV0dXJuIHZlYzModGhpcy54ICogdi54LCB0aGlzLnkgKiB2LnksIHRoaXMueiAqIHYueiwgdGhpcy53ICogdi53KTtcclxuICAgIH1cclxuICAgIC8vIERpdmlkZSBmdW5jdGlvblxyXG4gICAgZGl2KHYpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHYgPT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICBpZiAodiA9PSAwKSBhbGVydChcIkRpdmlzaW9uIGJ5IHplcm8hXCIpO1xyXG4gICAgICAgICAgICBpZiAodiA9PSAxKSByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgcmV0dXJuIHZlYzQodGhpcy54IC8gdiwgdGhpcy55IC8gdiwgdGhpcy56IC8gdiwgdGhpcy53IC8gdik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2ZWM0KHRoaXMueCAvIHYueCwgdGhpcy55IC8gdi55LCB0aGlzLnogLyB2LnosIHRoaXMudyAvIHYudyk7XHJcbiAgICB9XHJcbiAgICAvLyBUd28gdmVjdG9ycyBkb3QgcHJvZHVjdCBmdW5jdGlvblxyXG4gICAgZG90KHZlYykge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIHRoaXMueCAqIHZlYy54ICsgdGhpcy55ICogdmVjLnkgKyB0aGlzLnogKiB2ZWMueiArIHRoaXMudyAqIHZlYy53XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuICAgIC8vIEdldCBsZW5ndGggb2YgdmVjdG9yIGZ1bmN0aW9uXHJcbiAgICBsZW5ndGgoKSB7XHJcbiAgICAgICAgbGV0IGxlbiA9IHRoaXMuZG90KHRoaXMpO1xyXG5cclxuICAgICAgICBpZiAobGVuID09IDEgfHwgbGVuID09IDApIHJldHVybiBsZW47XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydChsZW4pO1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGxlbmd0aCAqIGxlbmd0aCBvZiB2ZWN0b3IgZnVuY3Rpb25cclxuICAgIGxlbmd0aDIoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZG90KHRoaXMpO1xyXG4gICAgfVxyXG4gICAgLy8gTm9ybWFsaXplIHZlY3RvciBmdW5jdGlvblxyXG4gICAgbm9ybWFsaXplKCkge1xyXG4gICAgICAgIGxldCBsZW4gPSB0aGlzLmRvdCh0aGlzKTtcclxuXHJcbiAgICAgICAgaWYgKGxlbiA9PSAxIHx8IGxlbiA9PSAwKSByZXR1cm4gdGhpcztcclxuICAgICAgICByZXR1cm4gdGhpcy5kaXYoTWF0aC5zcXJ0KGxlbikpO1xyXG4gICAgfVxyXG4gICAgLy8gR2V0IGFycmF5IGZyb20gdmVjM1xyXG4gICAgdG9BcnJheSgpIHtcclxuICAgICAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnosIHRoaXMud107XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0IGZ1bmN0aW9uIHZlYzQoLi4uYXJncykge1xyXG4gICAgcmV0dXJuIG5ldyBfdmVjNCguLi5hcmdzKTtcclxufVxyXG5cclxuLy8gZXhwb3J0IGZ1bmN0aW9uIHZlYzIoLi4uYXJncykge1xyXG4vLyAgICAgcmV0dXJuIG5ldyBfdmVjMyguLi5hcmdzKTtcclxuLy8gfVxyXG5cclxuLy8gZXhwb3J0IGZ1bmN0aW9uIHZlYzQoLi4uYXJncykge1xyXG4vLyAgICAgcmV0dXJuIG5ldyBfdmVjMyguLi5hcmdzKTtcclxuLy8gfVxyXG4iLCIvLyBNYXRoIGltcGxlbWVudGF0aW9ucyBmaWxlXHJcblxyXG4vLyBEZWdyZWVzIHRvIHJhZGlhbnMgY29udmVyc2lvblxyXG5leHBvcnQgZnVuY3Rpb24gRDJSKGEpIHtcclxuICByZXR1cm4gYSAqIChNYXRoLlBJIC8gMTgwLjApO1xyXG59XHJcbi8vIFJhZGlhbnMgdG8gZGVncmVlcyBjb252ZXJzaW9uXHJcbmV4cG9ydCBmdW5jdGlvbiBSMkQoYSkge1xyXG4gIHJldHVybiBhICogKDE4MC4wIC8gTWF0aC5QSSk7XHJcbn1cclxuXHJcbi8qKipcclxuICogTWF0cmljZXNcclxuICoqKi9cclxuXHJcbmNsYXNzIF9tYXQ0IHtcclxuICBjb25zdHJ1Y3RvcihtID0gbnVsbCkge1xyXG4gICAgaWYgKG0gPT0gbnVsbClcclxuICAgICAgdGhpcy5tID0gW1xyXG4gICAgICAgIFsxLCAwLCAwLCAwXSxcclxuICAgICAgICBbMCwgMSwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDAsIDEsIDBdLFxyXG4gICAgICAgIFswLCAwLCAwLCAxXSxcclxuICAgICAgXTtcclxuICAgIGVsc2UgaWYgKHR5cGVvZiBtID09IFwib2JqZWN0XCIgJiYgbS5sZW5ndGggPT0gNCkge1xyXG4gICAgICB0aGlzLm0gPSBtO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5tID0gbS5tO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbXVsKG0pIHtcclxuICAgIGxldCBtYXRyO1xyXG5cclxuICAgIGlmIChtLmxlbmd0aCA9PSA0KSBtYXRyID0gbTtcclxuICAgIGVsc2UgbWF0ciA9IG0ubTtcclxuXHJcbiAgICB0aGlzLm0gPSBbXHJcbiAgICAgIFtcclxuICAgICAgICB0aGlzLm1bMF1bMF0gKiBtYXRyWzBdWzBdICtcclxuICAgICAgICAgIHRoaXMubVswXVsxXSAqIG1hdHJbMV1bMF0gK1xyXG4gICAgICAgICAgdGhpcy5tWzBdWzJdICogbWF0clsyXVswXSArXHJcbiAgICAgICAgICB0aGlzLm1bMF1bM10gKiBtYXRyWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVswXVswXSAqIG1hdHJbMF1bMV0gK1xyXG4gICAgICAgICAgdGhpcy5tWzBdWzFdICogbWF0clsxXVsxXSArXHJcbiAgICAgICAgICB0aGlzLm1bMF1bMl0gKiBtYXRyWzJdWzFdICtcclxuICAgICAgICAgIHRoaXMubVswXVszXSAqIG1hdHJbM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzBdICogbWF0clswXVsyXSArXHJcbiAgICAgICAgICB0aGlzLm1bMF1bMV0gKiBtYXRyWzFdWzJdICtcclxuICAgICAgICAgIHRoaXMubVswXVsyXSAqIG1hdHJbMl1bMl0gK1xyXG4gICAgICAgICAgdGhpcy5tWzBdWzNdICogbWF0clszXVsyXSxcclxuICAgICAgICB0aGlzLm1bMF1bMF0gKiBtYXRyWzBdWzNdICtcclxuICAgICAgICAgIHRoaXMubVswXVsxXSAqIG1hdHJbMV1bM10gK1xyXG4gICAgICAgICAgdGhpcy5tWzBdWzJdICogbWF0clsyXVszXSArXHJcbiAgICAgICAgICB0aGlzLm1bMF1bM10gKiBtYXRyWzNdWzNdLFxyXG4gICAgICBdLFxyXG4gICAgICBbXHJcbiAgICAgICAgdGhpcy5tWzFdWzBdICogbWF0clswXVswXSArXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMV0gKiBtYXRyWzFdWzBdICtcclxuICAgICAgICAgIHRoaXMubVsxXVsyXSAqIG1hdHJbMl1bMF0gK1xyXG4gICAgICAgICAgdGhpcy5tWzFdWzNdICogbWF0clszXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMF0gKiBtYXRyWzBdWzFdICtcclxuICAgICAgICAgIHRoaXMubVsxXVsxXSAqIG1hdHJbMV1bMV0gK1xyXG4gICAgICAgICAgdGhpcy5tWzFdWzJdICogbWF0clsyXVsxXSArXHJcbiAgICAgICAgICB0aGlzLm1bMV1bM10gKiBtYXRyWzNdWzFdLFxyXG4gICAgICAgIHRoaXMubVsxXVswXSAqIG1hdHJbMF1bMl0gK1xyXG4gICAgICAgICAgdGhpcy5tWzFdWzFdICogbWF0clsxXVsyXSArXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMl0gKiBtYXRyWzJdWzJdICtcclxuICAgICAgICAgIHRoaXMubVsxXVszXSAqIG1hdHJbM11bMl0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzBdICogbWF0clswXVszXSArXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMV0gKiBtYXRyWzFdWzNdICtcclxuICAgICAgICAgIHRoaXMubVsxXVsyXSAqIG1hdHJbMl1bM10gK1xyXG4gICAgICAgICAgdGhpcy5tWzFdWzNdICogbWF0clszXVszXSxcclxuICAgICAgXSxcclxuICAgICAgW1xyXG4gICAgICAgIHRoaXMubVsyXVswXSAqIG1hdHJbMF1bMF0gK1xyXG4gICAgICAgICAgdGhpcy5tWzJdWzFdICogbWF0clsxXVswXSArXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMl0gKiBtYXRyWzJdWzBdICtcclxuICAgICAgICAgIHRoaXMubVsyXVszXSAqIG1hdHJbM11bMF0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdICogbWF0clswXVsxXSArXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMV0gKiBtYXRyWzFdWzFdICtcclxuICAgICAgICAgIHRoaXMubVsyXVsyXSAqIG1hdHJbMl1bMV0gK1xyXG4gICAgICAgICAgdGhpcy5tWzJdWzNdICogbWF0clszXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bMF0gKiBtYXRyWzBdWzJdICtcclxuICAgICAgICAgIHRoaXMubVsyXVsxXSAqIG1hdHJbMV1bMl0gK1xyXG4gICAgICAgICAgdGhpcy5tWzJdWzJdICogbWF0clsyXVsyXSArXHJcbiAgICAgICAgICB0aGlzLm1bMl1bM10gKiBtYXRyWzNdWzJdLFxyXG4gICAgICAgIHRoaXMubVsyXVswXSAqIG1hdHJbMF1bM10gK1xyXG4gICAgICAgICAgdGhpcy5tWzJdWzFdICogbWF0clsxXVszXSArXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMl0gKiBtYXRyWzJdWzNdICtcclxuICAgICAgICAgIHRoaXMubVsyXVszXSAqIG1hdHJbM11bM10sXHJcbiAgICAgIF0sXHJcbiAgICAgIFtcclxuICAgICAgICB0aGlzLm1bM11bMF0gKiBtYXRyWzBdWzBdICtcclxuICAgICAgICAgIHRoaXMubVszXVsxXSAqIG1hdHJbMV1bMF0gK1xyXG4gICAgICAgICAgdGhpcy5tWzNdWzJdICogbWF0clsyXVswXSArXHJcbiAgICAgICAgICB0aGlzLm1bM11bM10gKiBtYXRyWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVswXSAqIG1hdHJbMF1bMV0gK1xyXG4gICAgICAgICAgdGhpcy5tWzNdWzFdICogbWF0clsxXVsxXSArXHJcbiAgICAgICAgICB0aGlzLm1bM11bMl0gKiBtYXRyWzJdWzFdICtcclxuICAgICAgICAgIHRoaXMubVszXVszXSAqIG1hdHJbM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdICogbWF0clswXVsyXSArXHJcbiAgICAgICAgICB0aGlzLm1bM11bMV0gKiBtYXRyWzFdWzJdICtcclxuICAgICAgICAgIHRoaXMubVszXVsyXSAqIG1hdHJbMl1bMl0gK1xyXG4gICAgICAgICAgdGhpcy5tWzNdWzNdICogbWF0clszXVsyXSxcclxuICAgICAgICB0aGlzLm1bM11bMF0gKiBtYXRyWzBdWzNdICtcclxuICAgICAgICAgIHRoaXMubVszXVsxXSAqIG1hdHJbMV1bM10gK1xyXG4gICAgICAgICAgdGhpcy5tWzNdWzJdICogbWF0clsyXVszXSArXHJcbiAgICAgICAgICB0aGlzLm1bM11bM10gKiBtYXRyWzNdWzNdLFxyXG4gICAgICBdLFxyXG4gICAgXTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLy8gU2V0IHRyYW5zbGF0ZSBtYXRyaXhcclxuICBzZXRUcmFuc2xhdGUoZHgsIGR5LCBkeikge1xyXG4gICAgaWYgKHR5cGVvZiBkeCA9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgIHRoaXMubSA9IFtcclxuICAgICAgICBbMSwgMCwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgICBbZHgueCwgZHgueSwgZHgueiwgMV0sXHJcbiAgICAgIF07XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgaWYgKGR5ID09IHVuZGVmaW5lZCAmJiBkeiA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdGhpcy5tID0gW1xyXG4gICAgICAgIFsxLCAwLCAwLCAwXSxcclxuICAgICAgICBbMCwgMSwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDAsIDEsIDBdLFxyXG4gICAgICAgIFtkeCwgZHgsIGR4LCAxXSxcclxuICAgICAgXTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgICB0aGlzLm0gPSBbXHJcbiAgICAgIFsxLCAwLCAwLCAwXSxcclxuICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICBbMCwgMCwgMSwgMF0sXHJcbiAgICAgIFtkeCwgZHksIGR6LCAxXSxcclxuICAgIF07XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIFRyYW5zbGF0ZSBtYXRyaXhcclxuICB0cmFuc2xhdGUoZHgsIGR5LCBkeikge1xyXG4gICAgaWYgKHR5cGVvZiBkeCA9PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgIHRoaXMubXVsKFtcclxuICAgICAgICBbMSwgMCwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgICBbZHgueCwgZHgueSwgZHgueiwgMV0sXHJcbiAgICAgIF0pO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIGlmIChkeSA9PSB1bmRlZmluZWQgJiYgZHogPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHRoaXMubXVsKFtcclxuICAgICAgICBbMSwgMCwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgICBbZHgsIGR4LCBkeCwgMV0sXHJcbiAgICAgIF0pO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIHRoaXMubXVsKFtcclxuICAgICAgWzEsIDAsIDAsIDBdLFxyXG4gICAgICBbMCwgMSwgMCwgMF0sXHJcbiAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgW2R4LCBkeSwgZHosIDFdLFxyXG4gICAgXSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIE1hdHJpeCBkZXRlcm1pbmF0b3IgM3gzXHJcbiAgZGV0ZXJtM3gzKGExMSwgYTEyLCBhMTMsIGEyMSwgYTIyLCBhMjMsIGEzMSwgYTMyLCBhMzMpIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgIGExMSAqIGEyMiAqIGEzMyAtXHJcbiAgICAgIGExMSAqIGEyMyAqIGEzMiAtXHJcbiAgICAgIGExMiAqIGEyMSAqIGEzMyArXHJcbiAgICAgIGExMiAqIGEyMyAqIGEzMSArXHJcbiAgICAgIGExMyAqIGEyMSAqIGEzMiAtXHJcbiAgICAgIGExMyAqIGEyMiAqIGEzMVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIE1hdHJpeCBkZXRlcm1pbmF0b3IgNHg0XHJcbiAgZGV0ZXJtKCkge1xyXG4gICAgbGV0IGRldCA9XHJcbiAgICAgIHRoaXMubVswXVswXSAqXHJcbiAgICAgICAgdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bMV1bM10sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bM10sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bM11cclxuICAgICAgICApIC1cclxuICAgICAgdGhpcy5tWzBdWzFdICpcclxuICAgICAgICB0aGlzLmRldGVybTN4MyhcclxuICAgICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICAgIHRoaXMubVsxXVsyXSxcclxuICAgICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICAgIHRoaXMubVsyXVswXSxcclxuICAgICAgICAgIHRoaXMubVsyXVsyXSxcclxuICAgICAgICAgIHRoaXMubVsyXVszXSxcclxuICAgICAgICAgIHRoaXMubVszXVswXSxcclxuICAgICAgICAgIHRoaXMubVszXVsyXSxcclxuICAgICAgICAgIHRoaXMubVszXVszXVxyXG4gICAgICAgICkgK1xyXG4gICAgICB0aGlzLm1bMF1bMl0gKlxyXG4gICAgICAgIHRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgICAgdGhpcy5tWzFdWzBdLFxyXG4gICAgICAgICAgdGhpcy5tWzFdWzFdLFxyXG4gICAgICAgICAgdGhpcy5tWzFdWzNdLFxyXG4gICAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgICAgdGhpcy5tWzJdWzFdLFxyXG4gICAgICAgICAgdGhpcy5tWzJdWzNdLFxyXG4gICAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgICAgdGhpcy5tWzNdWzFdLFxyXG4gICAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICAgKSAtXHJcbiAgICAgIHRoaXMubVswXVszXSAqXHJcbiAgICAgICAgdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMF0sXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMF0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMF0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgICB0aGlzLm1bM11bMl1cclxuICAgICAgICApO1xyXG5cclxuICAgIHJldHVybiBkZXQ7XHJcbiAgfSAvLyBFbmQgb2YgJ2RldGVybScgZnVuY3Rpb25cclxuXHJcbiAgaW52ZXJzZSgpIHtcclxuICAgIGxldCByID0gW1tdLCBbXSwgW10sIFtdXTtcclxuICAgIGxldCBkZXQgPSB0aGlzLmRldGVybSgpO1xyXG5cclxuICAgIGlmIChkZXQgPT0gMCkge1xyXG4gICAgICBsZXQgbSA9IFtcclxuICAgICAgICBbMSwgMCwgMCwgMF0sXHJcbiAgICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICAgIFswLCAwLCAxLCAwXSxcclxuICAgICAgICBbMCwgMCwgMCwgMV0sXHJcbiAgICAgIF07XHJcblxyXG4gICAgICByZXR1cm4gbWF0NChtKTtcclxuICAgIH1cclxuXHJcbiAgICAvKiBCdWlsZCBhZGpvaW50IG1hdHJpeCAqL1xyXG4gICAgclswXVswXSA9XHJcbiAgICAgIHRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVsxXVsxXSxcclxuICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzNdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzNdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bMl0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICByWzFdWzBdID1cclxuICAgICAgLXRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzNdLFxyXG4gICAgICAgIHRoaXMubVsyXVswXSxcclxuICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzNdLFxyXG4gICAgICAgIHRoaXMubVszXVswXSxcclxuICAgICAgICB0aGlzLm1bM11bMl0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICByWzJdWzBdID1cclxuICAgICAgdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgdGhpcy5tWzFdWzBdLFxyXG4gICAgICAgIHRoaXMubVsxXVsxXSxcclxuICAgICAgICB0aGlzLm1bMV1bM10sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bM10sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bM11cclxuICAgICAgKSAvIGRldDtcclxuICAgIHJbM11bMF0gPVxyXG4gICAgICAtdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgdGhpcy5tWzFdWzBdLFxyXG4gICAgICAgIHRoaXMubVsxXVsxXSxcclxuICAgICAgICB0aGlzLm1bMV1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bMl1cclxuICAgICAgKSAvIGRldDtcclxuXHJcbiAgICByWzBdWzFdID1cclxuICAgICAgLXRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVswXVsxXSxcclxuICAgICAgICB0aGlzLm1bMF1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzNdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bMl0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzNdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bMl0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICByWzFdWzFdID1cclxuICAgICAgdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgdGhpcy5tWzBdWzBdLFxyXG4gICAgICAgIHRoaXMubVswXVsyXSxcclxuICAgICAgICB0aGlzLm1bMF1bM10sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgIHRoaXMubVsyXVsyXSxcclxuICAgICAgICB0aGlzLm1bMl1bM10sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVsyXSxcclxuICAgICAgICB0aGlzLm1bM11bM11cclxuICAgICAgKSAvIGRldDtcclxuICAgIHJbMl1bMV0gPVxyXG4gICAgICAtdGhpcy5kZXRlcm0zeDMoXHJcbiAgICAgICAgdGhpcy5tWzBdWzBdLFxyXG4gICAgICAgIHRoaXMubVswXVsxXSxcclxuICAgICAgICB0aGlzLm1bMF1bM10sXHJcbiAgICAgICAgdGhpcy5tWzJdWzBdLFxyXG4gICAgICAgIHRoaXMubVsyXVsxXSxcclxuICAgICAgICB0aGlzLm1bMl1bM10sXHJcbiAgICAgICAgdGhpcy5tWzNdWzBdLFxyXG4gICAgICAgIHRoaXMubVszXVsxXSxcclxuICAgICAgICB0aGlzLm1bM11bM11cclxuICAgICAgKSAvIGRldDtcclxuICAgIHJbM11bMV0gPVxyXG4gICAgICB0aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzFdLFxyXG4gICAgICAgIHRoaXMubVswXVsyXSxcclxuICAgICAgICB0aGlzLm1bMl1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzFdLFxyXG4gICAgICAgIHRoaXMubVsyXVsyXSxcclxuICAgICAgICB0aGlzLm1bM11bMF0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzFdLFxyXG4gICAgICAgIHRoaXMubVszXVsyXVxyXG4gICAgICApIC8gZGV0O1xyXG5cclxuICAgIHJbMF1bMl0gPVxyXG4gICAgICB0aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzJdLFxyXG4gICAgICAgIHRoaXMubVszXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG4gICAgclsxXVsyXSA9XHJcbiAgICAgIC10aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bM11bMF0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzJdLFxyXG4gICAgICAgIHRoaXMubVszXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG4gICAgclsyXVsyXSA9XHJcbiAgICAgIHRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVswXVswXSxcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzNdLFxyXG4gICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzNdLFxyXG4gICAgICAgIHRoaXMubVszXVswXSxcclxuICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzNdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICByWzNdWzJdID1cclxuICAgICAgLXRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVswXVswXSxcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVszXVswXSxcclxuICAgICAgICB0aGlzLm1bM11bMV0sXHJcbiAgICAgICAgdGhpcy5tWzNdWzJdXHJcbiAgICAgICkgLyBkZXQ7XHJcblxyXG4gICAgclswXVszXSA9XHJcbiAgICAgIC10aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bMl1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzJdLFxyXG4gICAgICAgIHRoaXMubVsyXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG5cclxuICAgIHJbMV1bM10gPVxyXG4gICAgICB0aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bMl1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzJdLFxyXG4gICAgICAgIHRoaXMubVsyXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG4gICAgclsyXVszXSA9XHJcbiAgICAgIC10aGlzLmRldGVybTN4MyhcclxuICAgICAgICB0aGlzLm1bMF1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzFdLFxyXG4gICAgICAgIHRoaXMubVswXVszXSxcclxuICAgICAgICB0aGlzLm1bMV1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzFdLFxyXG4gICAgICAgIHRoaXMubVsxXVszXSxcclxuICAgICAgICB0aGlzLm1bMl1bMF0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzFdLFxyXG4gICAgICAgIHRoaXMubVsyXVszXVxyXG4gICAgICApIC8gZGV0O1xyXG4gICAgclszXVszXSA9XHJcbiAgICAgIHRoaXMuZGV0ZXJtM3gzKFxyXG4gICAgICAgIHRoaXMubVswXVswXSxcclxuICAgICAgICB0aGlzLm1bMF1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzBdWzJdLFxyXG4gICAgICAgIHRoaXMubVsxXVswXSxcclxuICAgICAgICB0aGlzLm1bMV1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzFdWzJdLFxyXG4gICAgICAgIHRoaXMubVsyXVswXSxcclxuICAgICAgICB0aGlzLm1bMl1bMV0sXHJcbiAgICAgICAgdGhpcy5tWzJdWzJdXHJcbiAgICAgICkgLyBkZXQ7XHJcbiAgICB0aGlzLm0gPSByO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSAvLyBFbmQgb2YgJ2ludmVyc2UnIGZ1bmN0aW9uXHJcblxyXG4gIC8vIFRyYW5zcG9zZWQgbWF0cml4XHJcbiAgdHJhbnNwb3NlKCkge1xyXG4gICAgbGV0IHIgPSBbW10sIFtdLCBbXSwgW11dO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKVxyXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IDQ7IGorKykgcltpXVtqXSA9IHRoaXMubVtqXVtpXTtcclxuICAgIHJldHVybiBtYXQ0KHIpO1xyXG4gIH0gLy8gRW5kIG9mICd0cmFuc3Bvc2UnIGZ1bmN0aW9uXHJcblxyXG4gIC8vIFJvdGF0ZVggbWF0cml4XHJcbiAgcm90YXRlWChhbmdsZURlZykge1xyXG4gICAgY29uc3Qgc2kgPSBNYXRoLnNpbihEMlIoYW5nbGVEZWcpKTtcclxuICAgIGNvbnN0IGNvID0gTWF0aC5jb3MoRDJSKGFuZ2xlRGVnKSk7XHJcbiAgICBjb25zdCBtciA9IFtcclxuICAgICAgWzEsIDAsIDAsIDBdLFxyXG4gICAgICBbMCwgY28sIHNpLCAwXSxcclxuICAgICAgWzAsIC1zaSwgY28sIDBdLFxyXG4gICAgICBbMCwgMCwgMCwgMV0sXHJcbiAgICBdO1xyXG5cclxuICAgIHJldHVybiB0aGlzLm11bChtcik7XHJcbiAgfVxyXG5cclxuICAvLyBSb3RhdGVZIG1hdHJpeFxyXG4gIHJvdGF0ZVkoYW5nbGVEZWcpIHtcclxuICAgIGNvbnN0IHNpID0gTWF0aC5zaW4oRDJSKGFuZ2xlRGVnKSk7XHJcbiAgICBjb25zdCBjbyA9IE1hdGguY29zKEQyUihhbmdsZURlZykpO1xyXG4gICAgY29uc3QgbXIgPSBbXHJcbiAgICAgIFtjbywgMCwgLXNpLCAwXSxcclxuICAgICAgWzAsIDEsIDAsIDBdLFxyXG4gICAgICBbc2ksIDAsIGNvLCAwXSxcclxuICAgICAgWzAsIDAsIDAsIDFdLFxyXG4gICAgXTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5tdWwobXIpO1xyXG4gIH1cclxuXHJcbiAgLy8gUm90YXRlWiBtYXRyaXhcclxuICByb3RhdGVaKGFuZ2xlRGVnKSB7XHJcbiAgICBjb25zdCBzaSA9IE1hdGguc2luKEQyUihhbmdsZURlZykpO1xyXG4gICAgY29uc3QgY28gPSBNYXRoLmNvcyhEMlIoYW5nbGVEZWcpKTtcclxuICAgIGNvbnN0IG1yID0gW1xyXG4gICAgICBbY28sIHNpLCAwLCAwXSxcclxuICAgICAgWy1zaSwgY28sIDAsIDBdLFxyXG4gICAgICBbMCwgMCwgMSwgMF0sXHJcbiAgICAgIFswLCAwLCAwLCAxXSxcclxuICAgIF07XHJcblxyXG4gICAgcmV0dXJuIHRoaXMubXVsKG1yKTtcclxuICB9XHJcblxyXG4gIHNldFJvdGF0ZShBbmdsZUluRGVncmVlLCBSKSB7XHJcbiAgICBsZXQgYSA9IEFuZ2xlSW5EZWdyZWUgKiBNYXRoLlBJLFxyXG4gICAgICBzaW5lID0gTWF0aC5zaW4oYSksXHJcbiAgICAgIGNvc2luZSA9IE1hdGguY29zKGEpO1xyXG4gICAgbGV0IHggPSAwLFxyXG4gICAgICB5ID0gMCxcclxuICAgICAgeiA9IDE7XHJcbiAgICBpZiAodHlwZW9mIFIgPT0gXCJvYmplY3RcIilcclxuICAgICAgaWYgKFIubGVuZ3RoID09IDMpICh4ID0gUlswXSksICh5ID0gUlsxXSksICh6ID0gUlsyXSk7XHJcbiAgICAgIGVsc2UgKHggPSBSLngpLCAoeSA9IFIueSksICh6ID0gUi56KTtcclxuICAgIC8vIFZlY3RvciBub3JtYWxpemVcclxuICAgIGxldCBsZW4gPSB4ICogeCArIHkgKiB5ICsgeiAqIHo7XHJcbiAgICBpZiAobGVuICE9IDAgJiYgbGVuICE9IDEpXHJcbiAgICAgIChsZW4gPSBNYXRoLnNxcnQobGVuKSksICh4IC89IGxlbiksICh5IC89IGxlbiksICh6IC89IGxlbik7XHJcbiAgICB0aGlzLm1bMF1bMF0gPSBjb3NpbmUgKyB4ICogeCAqICgxIC0gY29zaW5lKTtcclxuICAgIHRoaXMubVswXVsxXSA9IHggKiB5ICogKDEgLSBjb3NpbmUpICsgeiAqIHNpbmU7XHJcbiAgICB0aGlzLm1bMF1bMl0gPSB4ICogeiAqICgxIC0gY29zaW5lKSAtIHkgKiBzaW5lO1xyXG4gICAgdGhpcy5tWzBdWzNdID0gMDtcclxuICAgIHRoaXMubVsxXVswXSA9IHkgKiB4ICogKDEgLSBjb3NpbmUpIC0geiAqIHNpbmU7XHJcbiAgICB0aGlzLm1bMV1bMV0gPSBjb3NpbmUgKyB5ICogeSAqICgxIC0gY29zaW5lKTtcclxuICAgIHRoaXMubVsxXVsyXSA9IHkgKiB6ICogKDEgLSBjb3NpbmUpICsgeCAqIHNpbmU7XHJcbiAgICB0aGlzLm1bMV1bM10gPSAwO1xyXG4gICAgdGhpcy5tWzJdWzBdID0geiAqIHggKiAoMSAtIGNvc2luZSkgKyB5ICogc2luZTtcclxuICAgIHRoaXMubVsyXVsxXSA9IHogKiB5ICogKDEgLSBjb3NpbmUpIC0geCAqIHNpbmU7XHJcbiAgICB0aGlzLm1bMl1bMl0gPSBjb3NpbmUgKyB6ICogeiAqICgxIC0gY29zaW5lKTtcclxuICAgIHRoaXMubVsyXVszXSA9IDA7XHJcbiAgICB0aGlzLm1bM11bMF0gPSAwO1xyXG4gICAgdGhpcy5tWzNdWzFdID0gMDtcclxuICAgIHRoaXMubVszXVsyXSA9IDA7XHJcbiAgICB0aGlzLm1bM11bM10gPSAxO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSAvLyBFbmQgb2YgJ3NldFJvdGF0ZScgZnVuY3Rpb25cclxuXHJcbiAgcm90YXRlKEFuZ2xlSW5EZWdyZWUsIFIpIHtcclxuICAgIHJldHVybiB0aGlzLm11bChtYXQ0KCkuc2V0Um90YXRlKEFuZ2xlSW5EZWdyZWUsIFIpKTtcclxuICB9IC8vIEVuZCBvZiAncm90YXRlJyBmdW5jdGlvblxyXG5cclxuICBzZXRWaWV3KExvYywgQXQsIFVwMSkge1xyXG4gICAgbGV0IERpciA9IEF0LnN1YihMb2MpLm5vcm1hbGl6ZSgpLFxyXG4gICAgICBSaWdodCA9IERpci5jcm9zcyhVcDEpLm5vcm1hbGl6ZSgpLFxyXG4gICAgICBVcCA9IFJpZ2h0LmNyb3NzKERpcikubm9ybWFsaXplKCk7XHJcbiAgICB0aGlzLm0gPSBbXHJcbiAgICAgIFtSaWdodC54LCBVcC54LCAtRGlyLngsIDBdLFxyXG4gICAgICBbUmlnaHQueSwgVXAueSwgLURpci55LCAwXSxcclxuICAgICAgW1JpZ2h0LnosIFVwLnosIC1EaXIueiwgMF0sXHJcbiAgICAgIFstTG9jLmRvdChSaWdodCksIC1Mb2MuZG90KFVwKSwgTG9jLmRvdChEaXIpLCAxXSxcclxuICAgIF07XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9IC8vIEVuZCBvZiAnc2V0VmlldycgZnVuY3Rpb25cclxuXHJcbiAgc2V0T3J0aG8oTGVmdCwgUmlnaHQsIEJvdHRvbSwgVG9wLCBOZWFyLCBGYXIpIHtcclxuICAgIHRoaXMubSA9IFtcclxuICAgICAgWzIgLyAoUmlnaHQgLSBMZWZ0KSwgMCwgMCwgMF0sXHJcbiAgICAgIFswLCAyIC8gKFRvcCAtIEJvdHRvbSksIDAsIDBdLFxyXG4gICAgICBbMCwgMCwgLTIgLyAoRmFyIC0gTmVhciksIDBdLFxyXG4gICAgICBbXHJcbiAgICAgICAgLShSaWdodCArIExlZnQpIC8gKFJpZ2h0IC0gTGVmdCksXHJcbiAgICAgICAgLShUb3AgKyBCb3R0b20pIC8gKFRvcCAtIEJvdHRvbSksXHJcbiAgICAgICAgLShGYXIgKyBOZWFyKSAvIChGYXIgLSBOZWFyKSxcclxuICAgICAgICAxLFxyXG4gICAgICBdLFxyXG4gICAgXTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0gLy8gRW5kIG9mICdzZXRPcnRobycgZnVuY3Rpb25cclxuXHJcbiAgc2V0RnJ1c3R1bShMZWZ0LCBSaWdodCwgQm90dG9tLCBUb3AsIE5lYXIsIEZhcikge1xyXG4gICAgdGhpcy5tID0gW1xyXG4gICAgICBbKDIgKiBOZWFyKSAvIChSaWdodCAtIExlZnQpLCAwLCAwLCAwXSxcclxuICAgICAgWzAsICgyICogTmVhcikgLyAoVG9wIC0gQm90dG9tKSwgMCwgMF0sXHJcbiAgICAgIFtcclxuICAgICAgICAoUmlnaHQgKyBMZWZ0KSAvIChSaWdodCAtIExlZnQpLFxyXG4gICAgICAgIChUb3AgKyBCb3R0b20pIC8gKFRvcCAtIEJvdHRvbSksXHJcbiAgICAgICAgLShGYXIgKyBOZWFyKSAvIChGYXIgLSBOZWFyKSxcclxuICAgICAgICAtMSxcclxuICAgICAgXSxcclxuICAgICAgWzAsIDAsICgtMiAqIE5lYXIgKiBGYXIpIC8gKEZhciAtIE5lYXIpLCAwXSxcclxuICAgIF07XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9IC8vIEVuZCBvZiAnc2V0RnJ1c3R1bScgZnVuY3Rpb25cclxuXHJcbiAgdmlldyhMb2MsIEF0LCBVcDEpIHtcclxuICAgIHJldHVybiB0aGlzLm11bChtYXQ0KCkuc2V0VmlldyhMb2MsIEF0LCBVcDEpKTtcclxuICB9IC8vIEVuZCBvZiAndmlldycgZnVuY3Rpb25cclxuXHJcbiAgb3J0aG8oTGVmdCwgUmlnaHQsIEJvdHRvbSwgVG9wLCBOZWFyLCBGYXIpIHtcclxuICAgIHJldHVybiB0aGlzLm11bChtYXQ0KCkuc2V0T3J0aG8oTGVmdCwgUmlnaHQsIEJvdHRvbSwgVG9wLCBOZWFyLCBGYXIpKTtcclxuICB9IC8vIEVuZCBvZiAnb3J0aG8nIGZ1bmN0aW9uXHJcblxyXG4gIGZydXN0dW0oTGVmdCwgUmlnaHQsIEJvdHRvbSwgVG9wLCBOZWFyLCBGYXIpIHtcclxuICAgIHJldHVybiB0aGlzLm11bChtYXQ0KCkuc2V0RnJ1c3R1bShMZWZ0LCBSaWdodCwgQm90dG9tLCBUb3AsIE5lYXIsIEZhcikpO1xyXG4gIH0gLy8gRW5kIGlmICdmcnVzdHVtJyBmdW5jdGlvblxyXG5cclxuICB0b0FycmF5KCkge1xyXG4gICAgcmV0dXJuIFtdLmNvbmNhdCguLi50aGlzLm0pO1xyXG4gIH0gLy8gRW5kIG9mICd0b0FycmF5JyBmdW5jdGlvblxyXG5cclxuICBtdWwyKG0xLCBtMikge1xyXG4gICAgcmV0dXJuIG1hdDQobTEpLm11bChtMik7XHJcbiAgfSAvLyBFbmQgb2YgJ211bDInIGZ1bmN0aW9uXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXQ0KC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF9tYXQ0KC4uLmFyZ3MpO1xyXG59XHJcbiIsImltcG9ydCB7IG1hdDQgfSBmcm9tIFwiLi9tYXQ0LmpzXCI7XHJcbmltcG9ydCB7IHZlYzMgfSBmcm9tIFwiLi92ZWMzLmpzXCI7XHJcblxyXG5jbGFzcyBfY2FtZXJhIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIC8vIFByb2plY3Rpb24gcHJvcGVydGllc1xyXG4gICAgdGhpcy5wcm9qU2l6ZSA9IDAuMTsgLy8gUHJvamVjdCBwbGFuZSBmaXQgc3F1YXJlXHJcbiAgICB0aGlzLnByb2pEaXN0ID0gMC4xOyAvLyBEaXN0YW5jZSB0byBwcm9qZWN0IHBsYW5lIGZyb20gdmlld2VyIChuZWFyKVxyXG4gICAgdGhpcy5wcm9qRmFyQ2xpcCA9IDIwMDA7IC8vIERpc3RhbmNlIHRvIHByb2plY3QgZmFyIGNsaXAgcGxhbmUgKGZhcilcclxuXHJcbiAgICAvLyBMb2NhbCBzaXplIGRhdGFcclxuICAgIHRoaXMuZnJhbWVXID0gMzA7IC8vIEZyYW1lIHdpZHRoXHJcbiAgICB0aGlzLmZyYW1lSCA9IDMwOyAvLyBGcmFtZSBoZWlnaHRcclxuXHJcbiAgICAvLyBNYXRyaWNlc1xyXG4gICAgdGhpcy5tYXRyVmlldyA9IG1hdDQoKTsgLy8gVmlldyBjb29yZGluYXRlIHN5c3RlbSBtYXRyaXhcclxuICAgIHRoaXMubWF0clByb2ogPSBtYXQ0KCk7IC8vIFByb2plY3Rpb24gY29vcmRpbmF0ZSBzeXN0ZW0gbWF0cml4XHJcbiAgICB0aGlzLm1hdHJWUCA9IG1hdDQoKTsgLy8gVmlldyBhbmQgcHJvamVjdGlvbiBtYXRyaXggcHJlY2FsY3VsYXRlIHZhbHVlXHJcblxyXG4gICAgLy8gU2V0IGNhbWVyYSBkZWZhdWx0IHNldHRpbmdzXHJcbiAgICB0aGlzLmxvYyA9IHZlYzMoKTsgLy8gQ2FtZXJhIGxvY2F0aW9uXHJcbiAgICB0aGlzLmF0ID0gdmVjMygpOyAvLyBDYW1lcmEgZGVzdGluYXRpb25cclxuICAgIHRoaXMuZGlyID0gdmVjMygpOyAvLyBDYW1lcmEgRGlyZWN0aW9uXHJcbiAgICB0aGlzLnVwID0gdmVjMygpOyAvLyBDYW1lcmEgVVAgZGlyZWN0aW9uXHJcbiAgICB0aGlzLnJpZ2h0ID0gdmVjMygpOyAvLyBDYW1lcmEgUklHSFQgZGlyZWN0aW9uXHJcbiAgICB0aGlzLnNldERlZigpO1xyXG4gIH0gLy8gRW5kIG9mICdjb25zdHJ1Y3RvcicgZnVuY3Rpb25cclxuXHJcbiAgLy8gQ2FtZXJhIHBhcm1ldGVycyBzZXR0aW5nIGZ1bmN0aW9uXHJcbiAgc2V0KGxvYywgYXQsIHVwKSB7XHJcbiAgICB0aGlzLm1hdHJWaWV3LnNldFZpZXcobG9jLCBhdCwgdXApO1xyXG4gICAgdGhpcy5sb2MgPSB2ZWMzKGxvYyk7XHJcbiAgICB0aGlzLmF0ID0gdmVjMyhhdCk7XHJcbiAgICB0aGlzLmRpci5zZXQoXHJcbiAgICAgIC10aGlzLm1hdHJWaWV3Lm1bMF1bMl0sXHJcbiAgICAgIC10aGlzLm1hdHJWaWV3Lm1bMV1bMl0sXHJcbiAgICAgIC10aGlzLm1hdHJWaWV3Lm1bMl1bMl1cclxuICAgICk7XHJcbiAgICB0aGlzLnVwLnNldChcclxuICAgICAgdGhpcy5tYXRyVmlldy5tWzBdWzFdLFxyXG4gICAgICB0aGlzLm1hdHJWaWV3Lm1bMV1bMV0sXHJcbiAgICAgIHRoaXMubWF0clZpZXcubVsyXVsxXVxyXG4gICAgKTtcclxuICAgIHRoaXMucmlnaHQuc2V0KFxyXG4gICAgICB0aGlzLm1hdHJWaWV3Lm1bMF1bMF0sXHJcbiAgICAgIHRoaXMubWF0clZpZXcubVsxXVswXSxcclxuICAgICAgdGhpcy5tYXRyVmlldy5tWzJdWzBdXHJcbiAgICApO1xyXG4gICAgdGhpcy5tYXRyVlAgPSBtYXQ0KHRoaXMubWF0clZpZXcpLm11bCh0aGlzLm1hdHJQcm9qKTtcclxuICB9IC8vIEVuZCBvZiAnc2V0JyBmdW5jdGlvblxyXG5cclxuICAvLyBQcm9qZWN0aW9uIHBhcmFtZXRlcnMgc2V0dGluZyBmdW5jdGlvbi5cclxuICBzZXRQcm9qKHByb2pTaXplLCBwcm9qRGlzdCwgcHJvakZhckNsaXApIHtcclxuICAgIGxldCByeCA9IHByb2pTaXplLFxyXG4gICAgICByeSA9IHByb2pTaXplO1xyXG5cclxuICAgIHRoaXMucHJvakRpc3QgPSBwcm9qRGlzdDtcclxuICAgIHRoaXMucHJvalNpemUgPSBwcm9qU2l6ZTtcclxuICAgIHRoaXMucHJvakZhckNsaXAgPSBwcm9qRmFyQ2xpcDtcclxuXHJcbiAgICAvLyBDb3JyZWN0IGFzcGVjdCByYXRpb1xyXG4gICAgaWYgKHRoaXMuZnJhbWVXID4gdGhpcy5mcmFtZUgpIHJ4ICo9IHRoaXMuZnJhbWVXIC8gdGhpcy5mcmFtZUg7XHJcbiAgICBlbHNlIHJ5ICo9IHRoaXMuZnJhbWVIIC8gdGhpcy5mcmFtZVc7XHJcbiAgICB0aGlzLm1hdHJQcm9qLnNldEZydXN0dW0oXHJcbiAgICAgIC1yeCAvIDIuMCxcclxuICAgICAgcnggLyAyLjAsXHJcbiAgICAgIC1yeSAvIDIuMCxcclxuICAgICAgcnkgLyAyLjAsXHJcbiAgICAgIHByb2pEaXN0LFxyXG4gICAgICBwcm9qRmFyQ2xpcFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBwcmUtY2FsY3VsYXRlIHZpZXcgKiBwcm9qIG1hdHJpeFxyXG4gICAgdGhpcy5tYXRyVlAgPSBtYXQ0KHRoaXMubWF0clZpZXcpLm11bCh0aGlzLm1hdHJQcm9qKTtcclxuICB9IC8vIEVuZCBvZiAnc2V0UHJvaicgZnVuY3Rpb25cclxuXHJcbiAgLy8gUmVzaXplIGNhbWVyYSBhbmQgcHJvamVjdGlvbiBmdW5jdGlvbi5cclxuICBzZXRTaXplKGZyYW1lVywgZnJhbWVIKSB7XHJcbiAgICBpZiAoZnJhbWVXIDwgMSkgZnJhbWVXID0gMTtcclxuICAgIGlmIChmcmFtZUggPCAxKSBmcmFtZUggPSAxO1xyXG4gICAgdGhpcy5mcmFtZVcgPSBmcmFtZVc7XHJcbiAgICB0aGlzLmZyYW1lSCA9IGZyYW1lSDtcclxuICAgIC8vIFJlc2V0IHByb2plY3Rpb24gd2l0aCBuZXcgcmVuZGVyIHdpbmRvdyBzaXplXHJcbiAgICB0aGlzLnNldFByb2oodGhpcy5wcm9qU2l6ZSwgdGhpcy5wcm9qRGlzdCwgdGhpcy5wcm9qRmFyQ2xpcCk7XHJcbiAgfSAvLyBFbmQgb2YgJ3NldFNpemUnIGZ1bmN0aW9uXHJcblxyXG4gIC8vIENhbWVyYSBzZXQgZGVmYXVsdCB2YWx1ZXMgZnVuY3Rpb24uXHJcbiAgc2V0RGVmKCkge1xyXG4gICAgdGhpcy5sb2Muc2V0KDAsIDE1LjMsIDE1LjMpO1xyXG4gICAgdGhpcy5hdC5zZXQoMCwgMCwgMCk7XHJcbiAgICB0aGlzLmRpci5zZXQoMCwgMCwgLTEpO1xyXG4gICAgdGhpcy51cC5zZXQoMCwgMSwgMCk7XHJcbiAgICB0aGlzLnJpZ2h0LnNldCgxLCAwLCAwKTtcclxuXHJcbiAgICB0aGlzLnByb2pEaXN0ID0gMC4xO1xyXG4gICAgdGhpcy5wcm9qU2l6ZSA9IDAuMTtcclxuICAgIHRoaXMucHJvakZhckNsaXAgPSA2MDAwO1xyXG5cclxuICAgIHRoaXMuZnJhbWVXID0gNDc7XHJcbiAgICB0aGlzLmZyYW1lSCA9IDQ3O1xyXG5cclxuICAgIHRoaXMuc2V0KHRoaXMubG9jLCB0aGlzLmF0LCB0aGlzLnVwKTtcclxuICAgIHRoaXMuc2V0UHJvaih0aGlzLnByb2pTaXplLCB0aGlzLnByb2pEaXN0LCB0aGlzLnByb2pGYXJDbGlwKTtcclxuICAgIHRoaXMuc2V0U2l6ZSh0aGlzLmZyYW1lVywgdGhpcy5mcmFtZUgpO1xyXG4gIH0gLy8gRW5kIG9mICdzZXREZWYnIGZ1bmN0aW9uXHJcbn0gLy8gRW5kIG9mICdjYW1lcmEnIGNsYXNzXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2FtZXJhKC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF9jYW1lcmEoYXJncyk7XHJcbn0gLy8gRW5kIG9mICdtYXQ0JyBmdW5jdGlvblxyXG5cclxuLyogRU5EIE9GICdjYW1lcmEuanMnIEZJTEUgKi9cclxuIiwiZXhwb3J0IGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2xDYW52YXNcIik7XHJcbmV4cG9ydCBjb25zdCBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KFwid2ViZ2wyXCIpO1xyXG4vLyBleHBvcnQgbGV0IGFuaW07XHJcbiIsIi8vIFNoYWRlcnMgaW1wbGVtZW50YXRpb24gZmlsZVxyXG5pbXBvcnQgeyBnbCB9IGZyb20gXCIuLi8uLi8uLi9nbC5qc1wiO1xyXG5cclxuZXhwb3J0IGxldCBzaGFkZXJzID0gW107XHJcbmV4cG9ydCBsZXQgc2hhZGVyc1NpemUgPSAwO1xyXG5cclxuZXhwb3J0IGNsYXNzIF9zaGFkZXIge1xyXG4gIGNvbnN0cnVjdG9yKHNoYWRlckZpbGVOYW1lUHJlZml4KSB7XHJcbiAgICB0aGlzLm5hbWUgPSBzaGFkZXJGaWxlTmFtZVByZWZpeDtcclxuICAgIHRoaXMudmVydFRleHQgPSBmZXRjaFNoYWRlcihcclxuICAgICAgXCIuLi8uLi8uLi8uLi9iaW4vc2hhZGVycy9cIiArIHNoYWRlckZpbGVOYW1lUHJlZml4ICsgXCIvdmVydC5nbHNsXCJcclxuICAgICk7XHJcbiAgICB0aGlzLmZyYWdUZXh0ID0gZmV0Y2hTaGFkZXIoXHJcbiAgICAgIFwiLi4vLi4vLi4vLi4vYmluL3NoYWRlcnMvXCIgKyBzaGFkZXJGaWxlTmFtZVByZWZpeCArIFwiL2ZyYWcuZ2xzbFwiXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgYWRkKHZzLCBmcykge1xyXG4gICAgY29uc3QgdmVydGV4U2ggPSBsb2FkKGdsLlZFUlRFWF9TSEFERVIsIHZzKTtcclxuICAgIGNvbnN0IGZyYWdtZW50U2ggPSBsb2FkKGdsLkZSQUdNRU5UX1NIQURFUiwgZnMpO1xyXG5cclxuICAgIHRoaXMucHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcclxuICAgIGdsLmF0dGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIHZlcnRleFNoKTtcclxuICAgIGdsLmF0dGFjaFNoYWRlcih0aGlzLnByb2dyYW0sIGZyYWdtZW50U2gpO1xyXG4gICAgZ2wubGlua1Byb2dyYW0odGhpcy5wcm9ncmFtKTtcclxuXHJcbiAgICBpZiAoIWdsLmdldFByb2dyYW1QYXJhbWV0ZXIodGhpcy5wcm9ncmFtLCBnbC5MSU5LX1NUQVRVUykpIHtcclxuICAgICAgYWxlcnQoXCJFcnJvciBsaW5rIHByb2dyYW0hXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHNoYWRlcnNbc2hhZGVyc1NpemVdID0ge1xyXG4gICAgICBuYW1lOiAwLFxyXG4gICAgICBwcm9ncmFtOiAtMSxcclxuICAgIH07XHJcbiAgICBzaGFkZXJzW3NoYWRlcnNTaXplXS5uYW1lID0gdGhpcy5uYW1lO1xyXG4gICAgc2hhZGVyc1tzaGFkZXJzU2l6ZV0ucHJvZ3JhbSA9IHRoaXMucHJvZ3JhbTtcclxuICAgIHNoYWRlcnNTaXplKys7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbG9hZCh0eXBlLCBzb3VyY2UpIHtcclxuICBjb25zdCBzaGFkZXIgPSBnbC5jcmVhdGVTaGFkZXIodHlwZSk7XHJcblxyXG4gIGdsLnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSk7XHJcbiAgZ2wuY29tcGlsZVNoYWRlcihzaGFkZXIpO1xyXG5cclxuICBpZiAoIWdsLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIGdsLkNPTVBJTEVfU1RBVFVTKSkge1xyXG4gICAgYWxlcnQoXHJcbiAgICAgIFwiRXJyb3IgbG9hZCBcIiArXHJcbiAgICAgICAgKHR5cGUgPT09IGdsLlZFUlRFWF9TSEFERVIgPyBcInZlcnRleFwiIDogXCJmcmFnbWVudFwiKSArXHJcbiAgICAgICAgXCIgc2hhZGVyOiBcIiArXHJcbiAgICAgICAgZ2wuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHNoYWRlcjtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoU2hhZGVyKHNoYWRlclVSTCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHNoYWRlclVSTCk7XHJcbiAgICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG5cclxuICAgIHJldHVybiB0ZXh0O1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgY29uc29sZS5lcnJvcihlcnIpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzXHJcbmV4cG9ydCBmdW5jdGlvbiBzaGFkZXIoLi4uYXJncykge1xyXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlZlxyXG4gIHJldHVybiBuZXcgX3NoYWRlciguLi5hcmdzKTtcclxufVxyXG4iLCIvLyBNYXRlcmlhbCBpbXBsZW1lbnRhdGlvbiBmaWxlXHJcbmltcG9ydCB7IHZlYzMgfSBmcm9tIFwiLi4vLi4vLi4vbXRoL210aC5qc1wiO1xyXG4vLyBpbXBvcnQgeyBybmQsIHNoZCwgdGV4IH0gZnJvbSBcIi4vcmVzb3VyY2UuanNcIjtcclxuaW1wb3J0ICogYXMgc2hkIGZyb20gXCIuL3NoYWRlci5qc1wiXHJcbmltcG9ydCB7IGdsIH0gZnJvbSBcIi4uLy4uLy4uL2dsLmpzXCI7XHJcblxyXG5leHBvcnQgbGV0IG1hdGVyaWFscyA9IFtdO1xyXG5leHBvcnQgbGV0IG1hdGVyaWFsc1NpemUgPSAwO1xyXG5cclxubGV0IG10bExpYiA9IFtbXCJibGFja1wiLCBbMC4wLCAwLjAsIDAuMF0sICAgICAgICAgICAgIFswLjAxLCAwLjAxLCAwLjAxXSwgICAgICAgICAgIFswLjUsIDAuNSwgMC41XSwgICAgICAgICAgICAgICAzMl0sXHJcbiAgW1wiQnJhc3NcIiwgICAgICAgICBbMC4zMjk0MTIsMC4yMjM1MjksMC4wMjc0NTFdLCBbMC43ODAzOTIsMC41Njg2MjcsMC4xMTM3MjVdLCBbMC45OTIxNTcsMC45NDExNzYsMC44MDc4NDNdLCAyNy44OTc0XSxcclxuICBbXCJvcmFuZ2VcIiwgICAgICAgIFsxLDAuNSwwXSwgICAgICAgWzEsMC41LDBdLCAgICAgICBbMC4zOTM1NDgsMC4yNzE5MDYsMC4xNjY3MjFdLCAgMjUuNl0sXHJcbiAgW1wiQ2hyb21lXCIsICAgICAgICBbMC4yNSwgMC4yNSwgMC4yNV0sICAgICAgICAgIFswLjQsIDAuNCwgMC40XSwgICAgICAgICAgICAgIFswLjc3NDU5NywgMC43NzQ1OTcsIDAuNzc0NTk3XSwgNzYuOF0sXHJcbiAgW1wiQ29wcGVyXCIsICAgICAgICBbMC4xOTEyNSwwLjA3MzUsMC4wMjI1XSwgICAgIFswLjcwMzgsMC4yNzA0OCwwLjA4MjhdLCAgICAgIFswLjI1Njc3NywwLjEzNzYyMiwwLjA4NjAxNF0sICAxMi44XSxcclxuICBbXCJ5ZWxsb3dcIiwgICAgICAgICAgWzEsMSwwXSwgICAgIFsxLDEsMF0sICAgIFswLjYyODI4MSwwLjU1NTgwMiwwLjM2NjA2NV0sICA1MS4yXSxcclxuICBbXCJQZXdldGVyXCIsICAgICAgIFswLjEwNTg4LDAuMDU4ODI0LDAuMTEzNzI1XSwgWzAuNDI3NDUxLDAuNDcwNTg4LDAuNTQxMTc2XSwgWzAuMzMzMywwLjMzMzMsMC41MjE1NjldLCAgICAgIDkuODQ2MTVdLFxyXG4gIFtcIlNpbHZlclwiLCAgICAgICAgWzAuMTkyMjUsMC4xOTIyNSwwLjE5MjI1XSwgICBbMC41MDc1NCwwLjUwNzU0LDAuNTA3NTRdLCAgICBbMC41MDgyNzMsMC41MDgyNzMsMC41MDgyNzNdLCAgNTEuMl0sXHJcbiAgW1wiUG9saXNoZWQgU2lsdmVyXCIsIFswLjIzMTI1LDAuMjMxMjUsMC4yMzEyNV0sIFswLjI3NzUsMC4yNzc1LDAuMjc3NV0sICAgICAgIFswLjc3MzkxMSwwLjc3MzkxMSwwLjc3MzkxMV0sICA4OS42XSxcclxuICBbXCJibHVlXCIsICAgICBbMCwgMCwgMV0sICAgICAgWzAsIDAsIDFdLCAgICBbMC4yOTcyNTQsIDAuMzA4MjksIDAuMzA2Njc4XSwgMTIuOF0sXHJcbiAgW1wicmVkXCIsICAgICAgICAgIFsxLCAwLCAwXSwgIFsxLCAwLCAwXSwgIFswLjcyNzgxMSwgMC42MjY5NTksIDAuNjI2OTU5XSwgNzYuOF0sXHJcbiAgW1wiUG9saXNoZWQgR29sZFwiLCBbMC4yNDcyNSwgMC4yMjQ1LCAwLjA2NDVdLCAgIFswLjM0NjE1LCAwLjMxNDMsIDAuMDkwM10sICAgIFswLjc5NzM1NywgMC43MjM5OTEsIDAuMjA4MDA2XSwgODMuMl0sXHJcbiAgW1wiUG9saXNoZWQgQnJvbnplXCIsIFswLjI1LCAwLjE0OCwgMC4wNjQ3NV0sICAgIFswLjQsIDAuMjM2OCwgMC4xMDM2XSwgICAgICAgIFswLjc3NDU5NywgMC40NTg1NjEsIDAuMjAwNjIxXSwgNzYuOF0sXHJcbiAgW1wiUG9saXNoZWQgQ29wcGVyXCIsIFswLjIyOTUsIDAuMDg4MjUsIDAuMDI3NV0sIFswLjU1MDgsIDAuMjExOCwgMC4wNjZdLCAgICAgIFswLjU4MDU5NCwgMC4yMjMyNTcsIDAuMDY5NTcwMV0sIDUxLjJdLFxyXG4gIFtcIkphZGVcIiwgICAgICAgICAgWzAuMTM1LCAwLjIyMjUsIDAuMTU3NV0sICAgICBbMC4xMzUsIDAuMjIyNSwgMC4xNTc1XSwgICAgICBbMC4zMTYyMjgsIDAuMzE2MjI4LCAwLjMxNjIyOF0sIDEyLjhdLFxyXG4gIFtcIk9ic2lkaWFuXCIsICAgICAgWzAuMDUzNzUsIDAuMDUsIDAuMDY2MjVdLCAgICBbMC4xODI3NSwgMC4xNywgMC4yMjUyNV0sICAgICBbMC4zMzI3NDEsIDAuMzI4NjM0LCAwLjM0NjQzNV0sIDM4LjRdLFxyXG4gIFtcIlBlYXJsXCIsICAgICAgICAgWzAuMjUsIDAuMjA3MjUsIDAuMjA3MjVdLCAgICBbMS4wLCAwLjgyOSwgMC44MjldLCAgICAgICAgICBbMC4yOTY2NDgsIDAuMjk2NjQ4LCAwLjI5NjY0OF0sIDExLjI2NF0sXHJcbiAgW1wiZ3JlZW5cIiwgICAgICAgWzAsIDEsIDBdLCAgICBbMCwgMSwgMF0sICBbMC42MzMsIDAuNzI3ODExLCAwLjYzM10sICAgICAgIDc2LjhdLFxyXG4gIFtcIkJsYWNrIFJ1YmJlclwiLCAgWzAuMDIsIDAuMDIsIDAuMDJdLCAgICAgICAgICBbMC4wMSwgMC4wMSwgMC4wMV0sICAgICAgICAgICBbMC40LCAwLjQsIDAuNF0sICAgICAgICAgICAgICAgIDEwLjBdXTtcclxuXHJcbmNsYXNzIF9tYXRlcmlhbCB7XHJcbiAgY29uc3RydWN0b3IobmFtZSwga2EsIGtkLCBrcywgcGgsIHRyYW5zLCB0ZXh0dXJlcywgc2hhZGVyKSB7XHJcbiAgICAvLyBDcmVhdGUgbWF0ZXJpYWxcclxuICAgIGlmIChuYW1lID09IHVuZGVmaW5lZCkge1xyXG4gICAgICB0aGlzLm5hbWUgPSBcIkRlZmF1bHQgbWF0ZXJpYWxcIjtcclxuICAgICAgdGhpcy5rYSA9IHZlYzMoMC4xKTtcclxuICAgICAgdGhpcy5rZCA9IHZlYzMoMC45KTtcclxuICAgICAgdGhpcy5rcyA9IHZlYzMoMC4zKTtcclxuICAgICAgdGhpcy5waCA9IDMwLjA7XHJcbiAgICAgIHRoaXMudHJhbnMgPSAxLjA7XHJcbiAgICAgIHRoaXMudGV4dHVyZXMgPSBbXHJcbiAgICAgICAgbnVsbCwgLy8gdGV4LnRleHR1cmUoXCIuLi8uLi8uLi8uLi9iaW4vdGV4dHVyZXMvQ0dTRy1Mb2dvLnBuZ1wiKSxcclxuICAgICAgICBudWxsLFxyXG4gICAgICAgIG51bGwsXHJcbiAgICAgICAgbnVsbCxcclxuICAgICAgICBudWxsLFxyXG4gICAgICAgIG51bGwsXHJcbiAgICAgICAgbnVsbCxcclxuICAgICAgICBudWxsLFxyXG4gICAgICBdO1xyXG4gICAgICB0aGlzLnNoYWRlciA9IHNoZC5zaGFkZXJzWzBdO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgICAgdGhpcy5rYSA9IHZlYzMoa2EpO1xyXG4gICAgICB0aGlzLmtkID0gdmVjMyhrZCk7XHJcbiAgICAgIHRoaXMua3MgPSB2ZWMzKGtzKTtcclxuICAgICAgdGhpcy5waCA9IHBoO1xyXG4gICAgICB0aGlzLnRyYW5zID0gdHJhbnM7XHJcbiAgICAgIHRoaXMudGV4dHVyZXMgPSB0ZXh0dXJlcztcclxuICAgICAgdGhpcy5zaGFkZXIgPSBzaGFkZXI7XHJcbiAgICB9XHJcbiAgICBtYXRlcmlhbHNbbWF0ZXJpYWxzU2l6ZV0gPSB0aGlzO1xyXG4gICAgdGhpcy5tdGxObyA9IG1hdGVyaWFsc1NpemUrKztcclxuICB9XHJcblxyXG4gIGFwcGx5KG10bE5vKSB7XHJcbiAgICBsZXQgcHJnID0gbWF0ZXJpYWxzW210bE5vXS5zaGFkZXIucHJvZ3JhbTtcclxuICAgIGlmIChwcmcgPT0gbnVsbCB8fCBwcmcgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHByZyA9IHNoZC5zaGFkZXJzWzBdLnByb2dyYW07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBwcmcgPSBzaGQuc2hhZGVyc1ttdGxOb10ucHJvZ3JhbTsgLy8gVE9ET1xyXG4gICAgfVxyXG4gICAgaWYgKHByZyA9PSAwKSByZXR1cm4gMDtcclxuICAgIGdsLnVzZVByb2dyYW0ocHJnKTtcclxuXHJcbiAgICBmb3IgKGxldCB0IGluIHRoaXMudGV4dHVyZXMpXHJcbiAgICAgIGlmICh0aGlzLnRleHR1cmVzW3RdICE9IG51bGwpXHJcbiAgICAgICAgdGhpcy50ZXh0dXJlc1t0XS5hcHBseSh0aGlzLnNoYWRlciwgTnVtYmVyKHQpKTtcclxuXHJcbiAgICByZXR1cm4gcHJnO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGVyaWFsKC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF9tYXRlcmlhbCguLi5hcmdzKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRNdGxMaWIoKSB7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtdGxMaWIubGVuZ3RoOyBpKyspe1xyXG4gICAgbWF0ZXJpYWwobXRsTGliW2ldWzBdLCB2ZWMzKG10bExpYltpXVsxXSksIHZlYzMobXRsTGliW2ldWzJdKSwgdmVjMyhtdGxMaWJbaV1bM10pLCBtdGxMaWJbaV1bNF0sIDEsIG51bGwsIHNoZC5zaGFkZXIoXCJkZWZhdWx0XCIpKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaW5kTXRsQnlOYW1lKG5hbWUpIHtcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IG1hdGVyaWFscy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKG1hdGVyaWFsc1tpXS5uYW1lID09PSBuYW1lKSB7XHJcbiAgICAgIHJldHVybiBtYXRlcmlhbHNbaV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWF0ZXJpYWxzWzBdO1xyXG59XHJcbiIsIi8vIFRleHR1cmVzIGltcGxlbWVudGF0aW9uIGZpbGVcclxuLy8gaW1wb3J0ICogYXMgcm5kIGZyb20gXCIuLi9yZW5kZXIuanNcIjtcclxuaW1wb3J0IHsgZ2wgfSBmcm9tIFwiLi4vLi4vLi4vZ2wuanNcIjtcclxuXHJcbmNsYXNzIF90ZXh0dXJlIHtcclxuICBjb25zdHJ1Y3RvcihmaWxlTmFtZSkge1xyXG4gICAgdGhpcy5pZCA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcclxuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQpO1xyXG4gICAgZ2wudGV4SW1hZ2UyRChcclxuICAgICAgZ2wuVEVYVFVSRV8yRCxcclxuICAgICAgMCxcclxuICAgICAgZ2wuUkdCQSxcclxuICAgICAgMSxcclxuICAgICAgMSxcclxuICAgICAgMCxcclxuICAgICAgZ2wuUkdCQSxcclxuICAgICAgZ2wuVU5TSUdORURfQllURSxcclxuICAgICAgbmV3IFVpbnQ4QXJyYXkoWzI1NSwgMjU1LCAyNTUsIDBdKVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBpbWcgPSBuZXcgSW1hZ2UoKTtcclxuICAgIGltZy5zcmMgPSBmaWxlTmFtZTtcclxuICAgIGltZy5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgIGdsLnRleEltYWdlMkQoXHJcbiAgICAgICAgZ2wuVEVYVFVSRV8yRCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIGdsLlJHQkEsXHJcbiAgICAgICAgZ2wuUkdCQSxcclxuICAgICAgICBnbC5VTlNJR05FRF9CWVRFLFxyXG4gICAgICAgIGltZ1xyXG4gICAgICApO1xyXG4gICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEKTtcclxuICAgICAgZ2wudGV4UGFyYW1ldGVyaShcclxuICAgICAgICBnbC5URVhUVVJFXzJELFxyXG4gICAgICAgIGdsLlRFWFRVUkVfV1JBUF9TLFxyXG4gICAgICAgIGdsLlJFUEVBVFxyXG4gICAgICApO1xyXG4gICAgICBnbC50ZXhQYXJhbWV0ZXJpKFxyXG4gICAgICAgIGdsLlRFWFRVUkVfMkQsXHJcbiAgICAgICAgZ2wuVEVYVFVSRV9XUkFQX1QsXHJcbiAgICAgICAgZ2wuUkVQRUFUXHJcbiAgICAgICk7XHJcbiAgICAgIGdsLnRleFBhcmFtZXRlcmkoXHJcbiAgICAgICAgZ2wuVEVYVFVSRV8yRCxcclxuICAgICAgICBnbC5URVhUVVJFX01JTl9GSUxURVIsXHJcbiAgICAgICAgZ2wuTElORUFSX01JUE1BUF9MSU5FQVJcclxuICAgICAgKTtcclxuICAgICAgZ2wudGV4UGFyYW1ldGVyaShcclxuICAgICAgICBnbC5URVhUVVJFXzJELFxyXG4gICAgICAgIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUixcclxuICAgICAgICBnbC5MSU5FQVJcclxuICAgICAgKTtcclxuICAgIH07XHJcbiAgfVxyXG4gIGFwcGx5KHNoZCwgdGV4VW5pdCkge1xyXG4gICAgaWYgKHNoZCA9PSB1bmRlZmluZWQgfHwgc2hkLmlkID09IHVuZGVmaW5lZCB8fCBzaGQuaWQgPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24oc2hkLmlkLCBcIlRleHR1cmUwXCIpO1xyXG4gICAgZ2wuYWN0aXZlVGV4dHVyZShnbC5URVhUVVJFMCArIHRleFVuaXQpO1xyXG4gICAgZ2wuYmluZFRleHR1cmUodGhpcy50eXBlLCB0aGlzLmlkKTtcclxuICAgIGdsLnVuaWZvcm0xaShsb2MsIHRleFVuaXQpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRleHR1cmUoLi4uYXJncykge1xyXG4gIHJldHVybiBuZXcgX3RleHR1cmUoLi4uYXJncyk7XHJcbn1cclxuIiwiaW1wb3J0IHsgdmVjMywgdmVjMiwgdmVjNCB9IGZyb20gXCIuLi8uLi9tdGgvbXRoLmpzXCI7XHJcblxyXG5jbGFzcyBfdmVydGV4IHtcclxuICBjb25zdHJ1Y3RvcihwLCB0LCBuLCBjKSB7XHJcbiAgICBpZiAocCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdGhpcy5wID0gdmVjMygwKTtcclxuICAgICAgdGhpcy50ID0gdmVjMigwKTtcclxuICAgICAgdGhpcy5uID0gdmVjMygwKTtcclxuICAgICAgdGhpcy5jID0gdmVjNCgwKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMucCA9IHZlYzMocCk7XHJcbiAgICAgIHRoaXMudCA9IHZlYzIodCk7XHJcbiAgICAgIHRoaXMubiA9IHZlYzMobik7XHJcbiAgICAgIHRoaXMuYyA9IHZlYzQoYyk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmVydGV4KC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF92ZXJ0ZXgoLi4uYXJncyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRWZXJ0ZXhBcnJheShwb3NBcnJheSwgdGNBcnJheSwgbm9ybUFycmF5LCBjb2xBcnJheSkge1xyXG4gIGxldCB2ZXJ0ZXhBcnJheSA9IFtdO1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcG9zQXJyYXkubGVuZ3RoOyBpICs9IDMpIHtcclxuICAgIHZlcnRleEFycmF5LnB1c2goXHJcbiAgICAgIHZlcnRleChcclxuICAgICAgICBwb3NBcnJheSAhPSBudWxsXHJcbiAgICAgICAgICA/IHZlYzMocG9zQXJyYXlbaV0sIHBvc0FycmF5W2kgKyAxXSwgcG9zQXJyYXlbaSArIDJdKVxyXG4gICAgICAgICAgOiB2ZWMzKDApLFxyXG4gICAgICAgIHRjQXJyYXkgIT0gbnVsbCA/IHZlYzIodGNBcnJheVtpXSwgdGNBcnJheVtpICsgMV0pIDogdmVjMigwKSxcclxuICAgICAgICBub3JtQXJyYXkgIT0gbnVsbFxyXG4gICAgICAgICAgPyB2ZWMzKG5vcm1BcnJheVtpXSwgbm9ybUFycmF5W2kgKyAxXSwgbm9ybUFycmF5W2kgKyAyXSlcclxuICAgICAgICAgIDogdmVjMygwKSxcclxuICAgICAgICBjb2xBcnJheSAhPSBudWxsXHJcbiAgICAgICAgICA/IHZlYzQoY29sQXJyYXlbaV0sIGNvbEFycmF5W2kgKyAxXSwgY29sQXJyYXlbaSArIDJdLCBjb2xBcnJheVtpICsgM10pXHJcbiAgICAgICAgICA6IHZlYzQoMClcclxuICAgICAgKVxyXG4gICAgKTtcclxuICB9XHJcbiAgcmV0dXJuIHZlcnRleEFycmF5O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdG9BcnJheSh2ZXJ0ZXhBcnJheSkge1xyXG4gIGxldCBhID0gW107XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmVydGV4QXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIGEucHVzaCh2ZXJ0ZXhBcnJheVtpXS5wLngpO1xyXG4gICAgYS5wdXNoKHZlcnRleEFycmF5W2ldLnAueSk7XHJcbiAgICBhLnB1c2godmVydGV4QXJyYXlbaV0ucC56KTtcclxuICAgIGEucHVzaCh2ZXJ0ZXhBcnJheVtpXS50LngpO1xyXG4gICAgYS5wdXNoKHZlcnRleEFycmF5W2ldLnQueSk7XHJcbiAgICBhLnB1c2godmVydGV4QXJyYXlbaV0ubi54KTtcclxuICAgIGEucHVzaCh2ZXJ0ZXhBcnJheVtpXS5uLnkpO1xyXG4gICAgYS5wdXNoKHZlcnRleEFycmF5W2ldLm4ueik7XHJcbiAgICBhLnB1c2godmVydGV4QXJyYXlbaV0uYy54KTtcclxuICAgIGEucHVzaCh2ZXJ0ZXhBcnJheVtpXS5jLnkpO1xyXG4gICAgYS5wdXNoKHZlcnRleEFycmF5W2ldLmMueik7XHJcbiAgICBhLnB1c2godmVydGV4QXJyYXlbaV0uYy53KTtcclxuICB9XHJcbiAgcmV0dXJuIGE7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdXRvTm9ybWFscyh2ZXJ0ZXhBcnJheSwgaW5kZXhBcnJheSkge1xyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kZXhBcnJheS5sZW5ndGg7IGkgKz0gMykge1xyXG4gICAgbGV0IHAwID0gdmVydGV4QXJyYXlbaW5kZXhBcnJheVtpXV0sXHJcbiAgICAgIHAxID0gdmVydGV4QXJyYXlbaW5kZXhBcnJheVtpICsgMV1dLFxyXG4gICAgICBwMiA9IHZlcnRleEFycmF5W2luZGV4QXJyYXlbaSArIDJdXTtcclxuICAgIGNvbnN0IG5vcm1hbCA9IHAxLnAuc3ViKHAwLnApLmNyb3NzKHAyLnAuc3ViKHAwLnApKS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICBwMC5uID0gbm9ybWFsO1xyXG4gICAgcDEubiA9IG5vcm1hbDtcclxuICAgIHAyLm4gPSBub3JtYWw7XHJcbiAgICB2ZXJ0ZXhBcnJheVtpbmRleEFycmF5W2ldXSA9IHAwO1xyXG4gICAgdmVydGV4QXJyYXlbaW5kZXhBcnJheVtpICsgMV1dID0gcDE7XHJcbiAgICB2ZXJ0ZXhBcnJheVtpbmRleEFycmF5W2kgKyAyXV0gPSBwMjtcclxuICB9XHJcbiAgLy8gcmV0dXJuIHZlcnRleEFycmF5O1xyXG59XHJcbiIsIi8vIFByaW1pdGl2ZXMgaGFuZGxlIG1vZHVsZVxyXG5pbXBvcnQgeyBtYXQ0LCB2ZWMzLCB2ZWMyLCB2ZWM0IH0gZnJvbSBcIi4uLy4uL210aC9tdGguanNcIjtcclxuaW1wb3J0ICogYXMgbXRsIGZyb20gXCIuL3Jlcy9tYXRlcmlhbC5qc1wiO1xyXG5pbXBvcnQgeyBnbCB9IGZyb20gXCIuLi8uLi9nbC5qc1wiO1xyXG5pbXBvcnQgeyB2ZXJ0ZXgsIHRvQXJyYXksIGdldFZlcnRleEFycmF5LCBhdXRvTm9ybWFscyB9IGZyb20gXCIuL3ZlcnRleC5qc1wiO1xyXG5cclxuLy8gUHJpbWl0aXZlIGNsYXNzXHJcbmNsYXNzIF9wcmltIHtcclxuICBjb25zdHJ1Y3Rvcih0eXBlLCB2ZXJ0ZXhBcnJheSwgaW5kZXhBcnJheSwgbXRsTm8sIHNvY2tldElkKSB7XHJcbiAgICBpZiAodmVydGV4QXJyYXkgIT0gbnVsbCkge1xyXG4gICAgICAvLyBHZW5lcmF0ZSBhbmQgYmluZCB2ZXJ0ZXggYnVmZmVyXHJcbiAgICAgIHRoaXMudkJ1ZiA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy52QnVmKTtcclxuICAgICAgLy8gR2VuZXJhdGUgYW5kIGJpbmQgdmVydGV4IGFycmF5XHJcbiAgICAgIHRoaXMudkEgPSBnbC5jcmVhdGVWZXJ0ZXhBcnJheSgpO1xyXG4gICAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy52QSk7XHJcblxyXG4gICAgICAvLyBVcGxvYWQgZGF0YVxyXG4gICAgICBnbC5idWZmZXJEYXRhKFxyXG4gICAgICAgIGdsLkFSUkFZX0JVRkZFUixcclxuICAgICAgICBuZXcgRmxvYXQzMkFycmF5KHZlcnRleEFycmF5KSxcclxuICAgICAgICBnbC5TVEFUSUNfRFJBV1xyXG4gICAgICApO1xyXG4gICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKDAsIDMsIGdsLkZMT0FULCBmYWxzZSwgNCAqIDEyLCAwKTtcclxuICAgICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcigxLCAyLCBnbC5GTE9BVCwgZmFsc2UsIDQgKiAxMiwgNCAqIDMpO1xyXG4gICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKDIsIDMsIGdsLkZMT0FULCBmYWxzZSwgNCAqIDEyLCA0ICogNSk7XHJcbiAgICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoMywgNCwgZ2wuRkxPQVQsIGZhbHNlLCA0ICogMTIsIDQgKiA4KTtcclxuICAgICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkoMCk7XHJcbiAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KDEpO1xyXG4gICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheSgyKTtcclxuICAgICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkoMyk7XHJcbiAgICAgIGdsLmJpbmRWZXJ0ZXhBcnJheShudWxsKTtcclxuICAgIH1cclxuICAgIGlmIChpbmRleEFycmF5ICE9IG51bGwpIHtcclxuICAgICAgLy8gR2VuZXJhdGUgYW5kIGJpbmQgaW5kZXggYnVmZmVyXHJcbiAgICAgIHRoaXMuaUJ1ZiA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xyXG4gICAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmlCdWYpO1xyXG5cclxuICAgICAgLy8gVXBsb2FkIGRhdGFcclxuICAgICAgZ2wuYnVmZmVyRGF0YShcclxuICAgICAgICBnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUixcclxuICAgICAgICBuZXcgSW50MzJBcnJheShpbmRleEFycmF5KSxcclxuICAgICAgICBnbC5TVEFUSUNfRFJBV1xyXG4gICAgICApO1xyXG4gICAgICB0aGlzLm51bU9mRWxlbWVudHMgPSBpbmRleEFycmF5Lmxlbmd0aDtcclxuICAgIH0gZWxzZSBpZiAoaW5kZXhBcnJheSA9PSBudWxsICYmIHZlcnRleEFycmF5ICE9IG51bGwpIHtcclxuICAgICAgdGhpcy5udW1PZkVsZW1lbnRzID0gdmVydGV4QXJyYXkubGVuZ3RoO1xyXG4gICAgfSBlbHNlIHRoaXMubnVtT2ZFbGVtZW50cyA9IDA7XHJcbiAgICB0aGlzLnRyYW5zTWF0cml4ID0gbWF0NCgpO1xyXG4gICAgaWYgKHR5cGUgIT0gbnVsbCkge1xyXG4gICAgICB0aGlzLm10bE5vID0gbXRsTm87XHJcbiAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgIHRoaXMuaWQgPSBzb2NrZXRJZDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFByaW1pdGl2ZSBkcmF3aW5nIGZ1bmN0aW9uXHJcbiAgZHJhdyh3b3JsZE1hdHJpeCkge1xyXG4gICAgaWYgKHdvcmxkTWF0cml4ID09IHVuZGVmaW5lZCkgd29ybGRNYXRyaXggPSBtYXQ0KCk7XHJcbiAgICBjb25zdCB3ID0gbWF0NCgpLm11bDIodGhpcy50cmFuc01hdHJpeCwgd29ybGRNYXRyaXgpO1xyXG4gICAgY29uc3Qgd2ludiA9IG1hdDQodykuaW52ZXJzZSgpLnRyYW5zcG9zZSgpO1xyXG4gICAgY29uc3Qgd3ZwID0gbWF0NCh3KS5tdWwod2luZG93LmFuaW0uY2FtZXJhLm1hdHJWUCk7XHJcblxyXG4gICAgY29uc3QgcHJvZ0lkID0gbXRsLm1hdGVyaWFsc1t0aGlzLm10bE5vXS5hcHBseSh0aGlzLm10bE5vKTtcclxuXHJcbiAgICBsZXQgbG9jO1xyXG4gICAgLy8gUGFzcyBtYXRyaWNlc1xyXG4gICAgaWYgKChsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ0lkLCBcIk1hdHJXXCIpKSAhPSAtMSlcclxuICAgICAgZ2wudW5pZm9ybU1hdHJpeDRmdihsb2MsIGZhbHNlLCBuZXcgRmxvYXQzMkFycmF5KHcudG9BcnJheSgpKSk7XHJcbiAgICBpZiAoKGxvYyA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9nSWQsIFwiTWF0cldJbnZcIikpICE9IC0xKVxyXG4gICAgICBnbC51bmlmb3JtTWF0cml4NGZ2KGxvYywgZmFsc2UsIG5ldyBGbG9hdDMyQXJyYXkod2ludi50b0FycmF5KCkpKTtcclxuICAgIGlmICgobG9jID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dJZCwgXCJNYXRyV1ZQXCIpKSAhPSAtMSlcclxuICAgICAgZ2wudW5pZm9ybU1hdHJpeDRmdihsb2MsIGZhbHNlLCBuZXcgRmxvYXQzMkFycmF5KHd2cC50b0FycmF5KCkpKTtcclxuXHJcbiAgICAvLyBQYXNzIG1hdGVyaWFsIGRhdGFcclxuICAgIGlmICgobG9jID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dJZCwgXCJLYVwiKSkgIT0gLTEpIHtcclxuICAgICAgbGV0IGthID0gbXRsLm1hdGVyaWFsc1t0aGlzLm10bE5vXS5rYTtcclxuICAgICAgZ2wudW5pZm9ybTNmKGxvYywga2EueCwga2EueSwga2Eueik7XHJcbiAgICB9XHJcbiAgICBpZiAoKGxvYyA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9nSWQsIFwiS2RcIikpICE9IC0xKSB7XHJcbiAgICAgIGxldCBrZCA9IG10bC5tYXRlcmlhbHNbdGhpcy5tdGxOb10ua2Q7XHJcbiAgICAgIGdsLnVuaWZvcm0zZihsb2MsIGtkLngsIGtkLnksIGtkLnopO1xyXG4gICAgfVxyXG4gICAgaWYgKChsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ0lkLCBcIktzXCIpKSAhPSAtMSkge1xyXG4gICAgICBsZXQga3MgPSBtdGwubWF0ZXJpYWxzW3RoaXMubXRsTm9dLmtzO1xyXG4gICAgICBnbC51bmlmb3JtM2YobG9jLCBrcy54LCBrcy55LCBrcy56KTtcclxuICAgIH1cclxuICAgIGlmICgobG9jID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dJZCwgXCJQaFwiKSkgIT0gLTEpXHJcbiAgICAgIGdsLnVuaWZvcm0xZihsb2MsIG10bC5tYXRlcmlhbHNbdGhpcy5tdGxOb10ucGgpO1xyXG5cclxuICAgIC8vIFBhc3MgdGltZVxyXG4gICAgaWYgKChsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ0lkLCBcIlRpbWVcIikpICE9IC0xKVxyXG4gICAgICBnbC51bmlmb3JtMWYobG9jLCB3aW5kb3cuYW5pbS50aW1lci5nbG9iYWxUaW1lKTtcclxuXHJcbiAgICAvLyBQYXNzIGNhbWVyYSBkYXRhXHJcbiAgICBpZiAoKGxvYyA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9nSWQsIFwiQ2FtTG9jXCIpKSAhPSAtMSlcclxuICAgICAgZ2wudW5pZm9ybTNmKFxyXG4gICAgICAgIGxvYyxcclxuICAgICAgICB3aW5kb3cuYW5pbS5jYW1lcmEubG9jLngsXHJcbiAgICAgICAgd2luZG93LmFuaW0uY2FtZXJhLmxvYy55LFxyXG4gICAgICAgIHdpbmRvdy5hbmltLmNhbWVyYS5sb2MuelxyXG4gICAgICApO1xyXG4gICAgaWYgKChsb2MgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ0lkLCBcIkNhbURpclwiKSkgIT0gLTEpXHJcbiAgICAgIGdsLnVuaWZvcm0zZihcclxuICAgICAgICBsb2MsXHJcbiAgICAgICAgd2luZG93LmFuaW0uY2FtZXJhLmRpci54LFxyXG4gICAgICAgIHdpbmRvdy5hbmltLmNhbWVyYS5kaXIueSxcclxuICAgICAgICB3aW5kb3cuYW5pbS5jYW1lcmEuZGlyLnpcclxuICAgICAgKTtcclxuXHJcbiAgICBnbC5iaW5kVmVydGV4QXJyYXkodGhpcy52QSk7XHJcbiAgICBpZiAodGhpcy5pQnVmICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCB0aGlzLmlCdWYpO1xyXG4gICAgICBnbC5kcmF3RWxlbWVudHModGhpcy50eXBlLCB0aGlzLm51bU9mRWxlbWVudHMsIGdsLlVOU0lHTkVEX0lOVCwgMCk7XHJcbiAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIG51bGwpO1xyXG4gICAgfSBlbHNlIGdsLmRyYXdBcnJheXModGhpcy50eXBlLCAwLCB0aGlzLm51bU9mRWxlbWVudHMpO1xyXG5cclxuICAgIGdsLmJpbmRWZXJ0ZXhBcnJheShudWxsKTtcclxuICB9XHJcblxyXG4gIC8vIFNwaGVyZSBjcmVhdGlvbiBmdW5jdGlvblxyXG4gIGNyZWF0ZVNwaGVyZShyYWRpdXMsIHdpZHRoLCBoZWlnaHQpIHtcclxuICAgIGxldCB2ZXJ0ZXhBcnJheSA9IFtdLFxyXG4gICAgICBpbmRleEFycmF5ID0gW107XHJcblxyXG4gICAgLy8gQ3JlYXRlIHZlcnRleCBhcnJheSBmb3Igc3BoZXJlXHJcbiAgICBmb3IgKFxyXG4gICAgICBsZXQgaSA9IDAsIGsgPSAwLCB0aGV0YSA9IDA7XHJcbiAgICAgIGkgPCBoZWlnaHQ7XHJcbiAgICAgIGkrKywgdGhldGEgKz0gTWF0aC5QSSAvIChoZWlnaHQgLSAxKVxyXG4gICAgKVxyXG4gICAgICBmb3IgKFxyXG4gICAgICAgIGxldCBqID0gMCwgcGhpID0gMDtcclxuICAgICAgICBqIDwgd2lkdGg7XHJcbiAgICAgICAgaisrLCBwaGkgKz0gKDIgKiBNYXRoLlBJKSAvICh3aWR0aCAtIDEpXHJcbiAgICAgICkge1xyXG4gICAgICAgIHZlcnRleEFycmF5W2srK10gPSB2ZXJ0ZXgoXHJcbiAgICAgICAgICB2ZWMzKFxyXG4gICAgICAgICAgICByYWRpdXMgKiBNYXRoLnNpbih0aGV0YSkgKiBNYXRoLnNpbihwaGkpLFxyXG4gICAgICAgICAgICByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSksXHJcbiAgICAgICAgICAgIHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKSAqIE1hdGguY29zKHBoaSlcclxuICAgICAgICAgICksXHJcbiAgICAgICAgICB2ZWMyKDApLFxyXG4gICAgICAgICAgdmVjMyhcclxuICAgICAgICAgICAgTWF0aC5zaW4odGhldGEpICogTWF0aC5zaW4ocGhpKSxcclxuICAgICAgICAgICAgTWF0aC5jb3ModGhldGEpLFxyXG4gICAgICAgICAgICBNYXRoLnNpbih0aGV0YSkgKiBNYXRoLmNvcyhwaGkpXHJcbiAgICAgICAgICApLFxyXG4gICAgICAgICAgdmVjNCgxLCAxLCAwLCAxKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgaW5kZXggYXJyYXkgZm9yIHNwaGVyZVxyXG4gICAgZm9yIChsZXQgayA9IDAsIGluZCA9IDAsIGkgPSAwOyBpIDwgaGVpZ2h0IC0gMTsgaSsrLCBpbmQrKylcclxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB3aWR0aCAtIDE7IGorKywgaW5kKyspIHtcclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQ7XHJcbiAgICAgICAgaW5kZXhBcnJheVtrKytdID0gaW5kICsgMTtcclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQgKyB3aWR0aDtcclxuXHJcbiAgICAgICAgaW5kZXhBcnJheVtrKytdID0gaW5kICsgd2lkdGggKyAxO1xyXG4gICAgICAgIGluZGV4QXJyYXlbaysrXSA9IGluZCArIDE7XHJcbiAgICAgICAgaW5kZXhBcnJheVtrKytdID0gaW5kICsgd2lkdGg7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgbmV3IHNwaGVyZSBwcmltaXRpdmVcclxuICAgIHJldHVybiBuZXcgcHJpbShcclxuICAgICAgZ2wuVFJJQU5HTEVTLFxyXG4gICAgICB0b0FycmF5KHZlcnRleEFycmF5KSxcclxuICAgICAgaW5kZXhBcnJheSxcclxuICAgICAgdGhpcy5tdGxObyxcclxuICAgICAgdGhpcy5pZFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIFRvcnVzIGNyZWF0aW9uIGZ1bmN0aW9uXHJcbiAgY3JlYXRlVG9ydXMocmFkaXVzSW5uZXIsIHJhZGl1c091dGhlciwgd2lkdGgsIGhlaWdodCkge1xyXG4gICAgbGV0IHZlcnRleEFycmF5ID0gW10sXHJcbiAgICAgIGluZGV4QXJyYXkgPSBbXTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdmVydGV4IGFycmF5IGZvciB0b3J1c1xyXG4gICAgZm9yIChcclxuICAgICAgbGV0IGkgPSAwLCBrID0gMCwgYWxwaGEgPSAwO1xyXG4gICAgICBpIDwgaGVpZ2h0O1xyXG4gICAgICBpKyssIGFscGhhICs9ICgyICogTWF0aC5QSSkgLyAoaGVpZ2h0IC0gMSlcclxuICAgIClcclxuICAgICAgZm9yIChcclxuICAgICAgICBsZXQgaiA9IDAsIHBoaSA9IDA7XHJcbiAgICAgICAgaiA8IHdpZHRoO1xyXG4gICAgICAgIGorKywgcGhpICs9ICgyICogTWF0aC5QSSkgLyAod2lkdGggLSAxKVxyXG4gICAgICApIHtcclxuICAgICAgICB2ZXJ0ZXhBcnJheVtrKytdID0gdmVydGV4KFxyXG4gICAgICAgICAgdmVjMyhcclxuICAgICAgICAgICAgKHJhZGl1c0lubmVyICsgcmFkaXVzT3V0aGVyICogTWF0aC5jb3MoYWxwaGEpKSAqIE1hdGguc2luKHBoaSksXHJcbiAgICAgICAgICAgIHJhZGl1c091dGhlciAqIE1hdGguc2luKGFscGhhKSxcclxuICAgICAgICAgICAgKHJhZGl1c0lubmVyICsgcmFkaXVzT3V0aGVyICogTWF0aC5jb3MoYWxwaGEpKSAqIE1hdGguY29zKHBoaSlcclxuICAgICAgICAgICksXHJcbiAgICAgICAgICB2ZWMyKDApLFxyXG4gICAgICAgICAgdmVjMyhcclxuICAgICAgICAgICAgTWF0aC5jb3MoYWxwaGEpICogTWF0aC5zaW4ocGhpKSxcclxuICAgICAgICAgICAgTWF0aC5zaW4oYWxwaGEpLFxyXG4gICAgICAgICAgICBNYXRoLmNvcyhhbHBoYSkgKiBNYXRoLmNvcyhwaGkpXHJcbiAgICAgICAgICApLFxyXG4gICAgICAgICAgdmVjNCgxLCAxLCAwLCAxKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgaW5kZXggYXJyYXkgZm9yIHRvcnVzXHJcbiAgICBmb3IgKGxldCBpID0gMCwgayA9IDAsIGluZCA9IDA7IGkgPCBoZWlnaHQgLSAxOyBpbmQrKywgaSsrKVxyXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHdpZHRoIC0gMTsgaisrLCBpbmQrKykge1xyXG4gICAgICAgIGluZGV4QXJyYXlbaysrXSA9IGluZDtcclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQgKyAxO1xyXG4gICAgICAgIGluZGV4QXJyYXlbaysrXSA9IGluZCArIHdpZHRoO1xyXG5cclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQgKyB3aWR0aCArIDE7XHJcbiAgICAgICAgaW5kZXhBcnJheVtrKytdID0gaW5kICsgMTtcclxuICAgICAgICBpbmRleEFycmF5W2srK10gPSBpbmQgKyB3aWR0aDtcclxuICAgICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBuZXcgdG9ydXMgcHJpbWl0aXZlXHJcbiAgICByZXR1cm4gbmV3IHByaW0oXHJcbiAgICAgIGdsLlRSSUFOR0xFUyxcclxuICAgICAgdG9BcnJheSh2ZXJ0ZXhBcnJheSksXHJcbiAgICAgIGluZGV4QXJyYXksXHJcbiAgICAgIHRoaXMubXRsTm8sXHJcbiAgICAgIHRoaXMuaWRcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBib3goYk1pbiwgYk1heCkge1xyXG4gICAgY29uc3QgcG9zaXRpb25zID0gW1xyXG4gICAgICBiTWF4LngsIGJNYXgueSwgYk1pbi56LCBcclxuICAgICAgYk1heC54LCBiTWF4LnksIGJNYXgueiwgXHJcbiAgICAgIGJNYXgueCwgYk1pbi55LCBiTWF4LnosIFxyXG4gICAgICBiTWF4LngsIGJNaW4ueSwgYk1pbi56LCBcclxuICAgICAgYk1pbi54LCBiTWF4LnksIGJNYXgueiwgXHJcbiAgICAgIGJNaW4ueCwgYk1heC55LCBiTWluLnosIFxyXG4gICAgICBiTWluLngsIGJNaW4ueSwgYk1pbi56LCBcclxuICAgICAgYk1pbi54LCBiTWluLnksIGJNYXgueiwgXHJcbiAgICAgIGJNaW4ueCwgYk1heC55LCBiTWF4LnosIFxyXG4gICAgICBiTWF4LngsIGJNYXgueSwgYk1heC56LCBcclxuICAgICAgYk1heC54LCBiTWF4LnksIGJNaW4ueiwgXHJcbiAgICAgIGJNaW4ueCwgYk1heC55LCBiTWluLnosXHJcbiAgICAgIGJNaW4ueCwgYk1pbi55LCBiTWluLnosXHJcbiAgICAgIGJNYXgueCwgYk1pbi55LCBiTWluLnosIFxyXG4gICAgICBiTWF4LngsIGJNaW4ueSwgYk1heC56LCBcclxuICAgICAgYk1pbi54LCBiTWluLnksIGJNYXgueiwgXHJcbiAgICAgIGJNYXgueCwgYk1heC55LCBiTWF4LnosIFxyXG4gICAgICBiTWluLngsIGJNYXgueSwgYk1heC56LCBcclxuICAgICAgYk1pbi54LCBiTWluLnksIGJNYXgueiwgXHJcbiAgICAgIGJNYXgueCwgYk1pbi55LCBiTWF4LnosIFxyXG4gICAgICBiTWluLngsIGJNYXgueSwgYk1pbi56LFxyXG4gICAgICBiTWF4LngsIGJNYXgueSwgYk1pbi56LCBcclxuICAgICAgYk1heC54LCBiTWluLnksIGJNaW4ueiwgXHJcbiAgICAgIGJNaW4ueCwgYk1pbi55LCBiTWluLnosXHJcbiAgICBdXHJcbiAgICBjb25zdCBpbmRpY2VzID0gW1xyXG4gICAgICAwLCAxLCAyLCAwLCAyLCAzLCA0LCA1LCA2LCA0LCA2LCA3LCA4LCA5LCAxMCwgOCwgMTAsIDExLCAxMiwgMTMsIDE0LFxyXG4gICAgICAxMiwgMTQsIDE1LCAxNiwgMTcsIDE4LCAxNiwgMTgsIDE5LCAyMCwgMjEsIDIyLCAyMCwgMjIsIDIzLFxyXG4gICAgXVxyXG5cclxuICAgIGxldCBib3hWZXJ0ZXhBcnJheSA9IGdldFZlcnRleEFycmF5KHBvc2l0aW9ucywgbnVsbCwgbnVsbCwgbnVsbCk7XHJcbiAgICBhdXRvTm9ybWFscyhib3hWZXJ0ZXhBcnJheSwgaW5kaWNlcyk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYm94VmVydGV4QXJyYXkpO1xyXG5cclxuICAgIHJldHVybiBuZXcgcHJpbShnbC5UUklBTkdMRVMsXHJcbiAgICAgIHRvQXJyYXkoYm94VmVydGV4QXJyYXkpLFxyXG4gICAgICBpbmRpY2VzLFxyXG4gICAgICB0aGlzLm10bE5vLFxyXG4gICAgICB0aGlzLmlkKTtcclxuICB9ICBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByaW0oLi4uYXJncykge1xyXG4gIHJldHVybiBuZXcgX3ByaW0oLi4uYXJncyk7XHJcbn1cclxuIiwiLy8gUmVuZGVyIGltcGxlbWVudGF0aW8gZmlsZVxyXG4vLyBpbXBvcnQgeyBtdGwsIHRleCwgc2hkIH0gZnJvbSBcIi4vcmVzL3Jlc291cmNlLmpzXCI7XHJcbmltcG9ydCAqIGFzIG10bCBmcm9tIFwiLi9yZXMvbWF0ZXJpYWwuanNcIjtcclxuaW1wb3J0ICogYXMgdGV4IGZyb20gXCIuL3Jlcy90ZXh0dXJlLmpzXCI7XHJcbmltcG9ydCAqIGFzIHNoZCBmcm9tIFwiLi9yZXMvc2hhZGVyLmpzXCI7XHJcbmltcG9ydCB7IHByaW0gfSBmcm9tIFwiLi9wcmltaXRpdmUuanNcIjtcclxuaW1wb3J0IHsgbWF0NCB9IGZyb20gXCIuLi8uLi9tdGgvbXRoLmpzXCI7XHJcbmltcG9ydCB7IHZlYzMgfSBmcm9tIFwiLi4vLi4vbXRoL210aC5qc1wiO1xyXG5pbXBvcnQgeyBjYW52YXMsIGdsIH0gZnJvbSBcIi4uLy4uL2dsLmpzXCI7XHJcblxyXG5leHBvcnQgbGV0IHdhbGxzID0gW107XHJcbmxldCBtYXplSCA9IDEwO1xyXG5sZXQgbWF6ZUZsb29yID0gMDtcclxuZXhwb3J0IGxldCBtYXplUG9zID0gW1xyXG4gIFt2ZWMzKC05LCBtYXplRmxvb3IsIC03KSwgdmVjMygtNSwgbWF6ZUgsIC02KV0sXHJcbiAgW3ZlYzMoLTYsIG1hemVGbG9vciwgLTkpLCB2ZWMzKC01LCBtYXplSCwgLTcpXSxcclxuIC8vIFt2ZWMzKC00LCBtYXplRmxvb3IsIC0yKSwgdmVjMygxLCBtYXplSCwgMildLFxyXG4gIFt2ZWMzKDMsIG1hemVGbG9vciwgLTExKSwgdmVjMyg0LCBtYXplSCwgLTIpXSxcclxuICBbdmVjMyg0LCBtYXplRmxvb3IsIC0zKSwgdmVjMyg5LCBtYXplSCwgLTIpXSxcclxuICBbdmVjMyg4LCBtYXplRmxvb3IsIC04KSwgdmVjMyg5LCBtYXplSCwgLTMpXSxcclxuICBbdmVjMyg5LCBtYXplRmxvb3IsIC04KSwgdmVjMygxMSwgbWF6ZUgsIC03KV0sXHJcbiAgW3ZlYzMoNCwgbWF6ZUZsb29yLCAtMTEpLCB2ZWMzKDExLCBtYXplSCwgLTEwKV0sXHJcbiAgW3ZlYzMoNiwgbWF6ZUZsb29yLCA1KSwgdmVjMyg3LCBtYXplSCwgMTApXSxcclxuICBbdmVjMyg0LCBtYXplRmxvb3IsIDcpLCB2ZWMzKDYsIG1hemVILCA4KV0sXHJcbiAgW3ZlYzMoNywgbWF6ZUZsb29yLCA3KSwgdmVjMyg5LCBtYXplSCwgOCldLFxyXG4gIFt2ZWMzKC01LCBtYXplRmxvb3IsIDcpLCB2ZWMzKC0zLCBtYXplSCwgOCldLFxyXG4gIFt2ZWMzKC02LCBtYXplRmxvb3IsIDYpLCB2ZWMzKC01LCBtYXplSCwgOSldLFxyXG4gIFt2ZWMzKC04LCBtYXplRmxvb3IsIDgpLCB2ZWMzKC02LCBtYXplSCwgMTApXSxcclxuICBbdmVjMygtMTEsIG1hemVGbG9vciwgMTApLCB2ZWMzKC02LCBtYXplSCwgMTIpXSxcclxuICBbdmVjMygtMTIsIG1hemVGbG9vciwgMTApLCB2ZWMzKC0xMSwgbWF6ZUgsIDExKV0sXHJcblxyXG4gIFt2ZWMzKC02MCwgbWF6ZUZsb29yLCAtNjApLCB2ZWMzKC02MCwgbWF6ZUgsIDYwKV0sXHJcbiAgW3ZlYzMoLTYwLCBtYXplRmxvb3IsIC02MCksIHZlYzMoNjAsIG1hemVILCAtNjApXSxcclxuICBbdmVjMyg2MCwgbWF6ZUZsb29yLCAtNjApLCB2ZWMzKDYwLCBtYXplSCwgNjApXSxcclxuICBbdmVjMygtNjAsIG1hemVGbG9vciwgNjApLCB2ZWMzKDYwLCBtYXplSCwgNjApXSxcclxuXTtcclxuXHJcbmV4cG9ydCBjbGFzcyBSZW5kZXIge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgZ2wuY2xlYXJDb2xvcigwLjMsIDAuNDcsIDAuOCwgMSk7XHJcbiAgICBnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUKTtcclxuXHJcbiAgICB0aGlzLnNoYWRlckRlZmF1bHQgPSBzaGQuc2hhZGVyKFwiZGVmYXVsdFwiKTtcclxuICAgIHRoaXMuc2hhZGVyU2NvcGUgPSBzaGQuc2hhZGVyKFwic2NvcGVcIik7XHJcbiAgfVxyXG5cclxuICByZXNJbml0KCkge1xyXG4gICAgdGhpcy5tYXRlcmlhbCA9IG10bC5tYXRlcmlhbCgpO1xyXG4gICAgdGhpcy5tYXRlcmlhbFNjb3BlID0gbXRsLm1hdGVyaWFsKFxyXG4gICAgICBcIlNjb3BlIG1hdGVyaWFsXCIsXHJcbiAgICAgIHZlYzMoMSwgMCwgMCksXHJcbiAgICAgIHZlYzMoMSwgMCwgMCksXHJcbiAgICAgIHZlYzMoMSwgMCwgMCksXHJcbiAgICAgIDMwLjAsXHJcbiAgICAgIDEsXHJcbiAgICAgIG51bGwsXHJcbiAgICAgIHNoZC5zaGFkZXJzWzFdXHJcbiAgICApO1xyXG4gICAgdGhpcy50ZXh0dXJlID0gdGV4LnRleHR1cmUoKTtcclxuICAgIGNvbnN0IHggPSAwLjAxICogY2FudmFzLmNsaWVudEhlaWdodCAvIGNhbnZhcy5jbGllbnRXaWR0aDtcclxuICAgIGNvbnN0IHkgPSAwLjAxO1xyXG4gICAgdGhpcy5zY29wZVByaW0gPSBwcmltKFxyXG4gICAgICBnbC5UUklBTkdMRV9TVFJJUCxcclxuICAgICAgbmV3IEZsb2F0MzJBcnJheShbXHJcbiAgICAgICAgLXgsXHJcbiAgICAgICAgeSxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIC14LFxyXG4gICAgICAgIC15LFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgeCxcclxuICAgICAgICB5LFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgeCxcclxuICAgICAgICAteSxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgMCxcclxuICAgICAgICAwLFxyXG4gICAgICBdKSxcclxuICAgICAgbnVsbCxcclxuICAgICAgdGhpcy5tYXRlcmlhbFNjb3BlLm10bE5vXHJcbiAgICApO1xyXG4gICAgdGhpcy5vdGhlclByaW1pdGl2ZXMgPSBbXTtcclxuXHJcbiAgICBtdGwubG9hZE10bExpYigpO1xyXG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCBtYXplUG9zLmxlbmd0aDsgeCsrKSB7XHJcbiAgICAgIG1hemVQb3NbeF1bMF0gPSBtYXplUG9zW3hdWzBdLm11bCg1KTtcclxuICAgICAgbWF6ZVBvc1t4XVswXS55IC09IDM7XHJcbiAgICAgIG1hemVQb3NbeF1bMV0gPSBtYXplUG9zW3hdWzFdLm11bCg1KTtcclxuICAgICAgd2FsbHMucHVzaChwcmltKGdsLlRSSUFOR0xFUywgbnVsbCwgbnVsbCwgbXRsLmZpbmRNdGxCeU5hbWUoXCJPYnNpZGlhblwiKS5tdGxObywgeCkuYm94KG1hemVQb3NbeF1bMF0sIG1hemVQb3NbeF1bMV0pKTtcclxuICAgIH1cclxuICAgIHRoaXMuZmxvb3IgPSBwcmltKGdsLlRSSUFOR0xFUywgbnVsbCwgbnVsbCwgbXRsLmZpbmRNdGxCeU5hbWUoXCJPYnNpZGlhblwiKS5tdGxObywgeCkuYm94KHZlYzMoLTMwMCwgLTYsIC0zMDApLCB2ZWMzKDMwMCwgLTMsIDMwMCkpO1xyXG5cclxuICAgIGlmICh3aW5kb3cub3RoZXJQbGF5ZXJzICE9PSBudWxsKSB7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2luZG93Lm90aGVyUGxheWVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGxldCB0bXBQcmltID0gcHJpbShnbC5UUklBTkdMRVMsIG51bGwsIG51bGwsIG10bC5maW5kTXRsQnlOYW1lKHdpbmRvdy5vdGhlclBsYXllcnNbaV0uY29sb3IpLm10bE5vLCB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLmlkKS5jcmVhdGVTcGhlcmUoMywgMTAyLCAxMDIpO1xyXG4gICAgICAgIHRoaXMub3RoZXJQcmltaXRpdmVzLnB1c2godG1wUHJpbSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNyZWF0ZVNlbGZJZk5vdEV4aXN0cygpIHtcclxuICAgIGlmICh3aW5kb3cucGxheWVyICE9PSBudWxsICYmIHRoaXMucGxheWVyUHJpbWl0aXZlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgdGhpcy5wbGF5ZXJQcmltaXRpdmUgPSBwcmltKGdsLlRSSUFOR0xFUywgbnVsbCwgbnVsbCwgbXRsLmZpbmRNdGxCeU5hbWUod2luZG93LnBsYXllci5jb2xvcikubXRsTm8sIHdpbmRvdy5wbGF5ZXIuaWQpLmNyZWF0ZVNwaGVyZSgzLCAxMDIsIDEwMik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRCeUlkKG9iaikge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm90aGVyUHJpbWl0aXZlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAodGhpcy5vdGhlclByaW1pdGl2ZXNbaV0uaWQgPT09IG9iaikge1xyXG4gICAgICAgIHJldHVybiBpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gLTE7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVQbGF5ZXJzKCkge1xyXG4gICAgaWYgKHdpbmRvdy5vdGhlclBsYXllcnMgIT09IG51bGwpIHtcclxuICAgICAgLy9hZGRcclxuICAgICAgaWYgKHRoaXMub3RoZXJQcmltaXRpdmVzLmxlbmd0aCA8IHdpbmRvdy5vdGhlclBsYXllcnMubGVuZ3RoKSB7XHJcbiAgICAgICAgbGV0IG5hbWVzID0gW107XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2luZG93Lm90aGVyUGxheWVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgbGV0IGZsYWcgPSAwO1xyXG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLm90aGVyUHJpbWl0aXZlcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgaWYgKHRoaXMub3RoZXJQcmltaXRpdmVzW2pdLmlkID09PSB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLmlkKSB7XHJcbiAgICAgICAgICAgICAgZmxhZyA9IDE7XHJcbiAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoZmxhZyA9PT0gMCkge1xyXG4gICAgICAgICAgICBuYW1lcy5wdXNoKHdpbmRvdy5vdGhlclBsYXllcnNbaV0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgZyA9IDA7IGcgPCBuYW1lcy5sZW5ndGg7IGcrKykge1xyXG4gICAgICAgICAgbGV0IHRtcFByID0gcHJpbShnbC5UUklBTkdMRVMsIG51bGwsIG51bGwsIG10bC5maW5kTXRsQnlOYW1lKG5hbWVzW2ddLmNvbG9yKS5tdGxObywgbmFtZXNbZ10uaWQpLmNyZWF0ZVNwaGVyZSgzLCAxMDIsIDEwMik7XHJcbiAgICAgICAgICB0aGlzLm90aGVyUHJpbWl0aXZlcy5wdXNoKHRtcFByKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vZGVsZXRlXHJcbiAgICAgIGlmICh0aGlzLm90aGVyUHJpbWl0aXZlcy5sZW5ndGggPiB3aW5kb3cub3RoZXJQbGF5ZXJzLmxlbmd0aCkge1xyXG4gICAgICAgIGxldCBidWYgPSBbXTtcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMub3RoZXJQcmltaXRpdmVzLmxlbmd0aDsgeCsrKSB7XHJcbiAgICAgICAgICBsZXQgZmxnID0gMDtcclxuICAgICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgd2luZG93Lm90aGVyUGxheWVycy5sZW5ndGg7IHkrKykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vdGhlclByaW1pdGl2ZXNbeF0uaWQgPT09IHdpbmRvdy5vdGhlclBsYXllcnNbeV0uaWQpIHtcclxuICAgICAgICAgICAgICBmbGcgPSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoZmxnID09PSAwKSB7XHJcbiAgICAgICAgICAgIGJ1Zi5wdXNoKHgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgeiA9IDA7IHogPCBidWYubGVuZ3RoOyB6KyspIHtcclxuICAgICAgICAgIHRoaXMub3RoZXJQcmltaXRpdmVzLnNwbGljZShidWZbel0sIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZHJhd1dhbGxzKCkge1xyXG4gICAgZm9yIChsZXQgeCA9IDA7IHggPCB3YWxscy5sZW5ndGg7IHgrKykge1xyXG4gICAgICB3YWxsc1t4XS5kcmF3KCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBkcmF3U2VsZigpIHtcclxuICAgIC8vIERyYXcgcGxheWVyIHB0aW1pdGl2ZVxyXG4gICAgaWYgKHdpbmRvdy5wbGF5ZXIgIT09IG51bGwpIHtcclxuICAgICAgdGhpcy5wbGF5ZXJQcmltaXRpdmUuZHJhdyhtYXQ0KCkuc2V0VHJhbnNsYXRlKHdpbmRvdy5wbGF5ZXIueCwgd2luZG93LnBsYXllci55LCB3aW5kb3cucGxheWVyLnopKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGRyYXdPdGhlcigpIHtcclxuICAgIC8vIERyYXcgb3RoZXIgcHJpbWl0aXZlc1xyXG4gICAgaWYgKHdpbmRvdy5vdGhlclBsYXllcnMgIT09IG51bGwpIHtcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3aW5kb3cub3RoZXJQbGF5ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhpcy5vdGhlclByaW1pdGl2ZXNbdGhpcy5nZXRCeUlkKHdpbmRvdy5vdGhlclBsYXllcnNbaV0uaWQpXS5kcmF3KG1hdDQoKS5zZXRUcmFuc2xhdGUod2luZG93Lm90aGVyUGxheWVyc1tpXS54LCB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLnksIHdpbmRvdy5vdGhlclBsYXllcnNbaV0ueikpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsYXRlbnRDYW1lcmEoKSB7XHJcbiAgICBpZiAod2luZG93LnBsYXllciAhPSBudWxsKSB7XHJcbiAgICAgIGxldCBwb3MgPSB2ZWMzKHdpbmRvdy5wbGF5ZXIueCwgd2luZG93LnBsYXllci55LCB3aW5kb3cucGxheWVyLnopO1xyXG4gICAgICBsZXQgZGlyID0gdmVjMygwLCAwLCAtMSkubm9ybWFsaXplKCk7XHJcbiAgICAgIGxldCBub3JtID0gdmVjMygwLCAxLCAwKTtcclxuICAgICAgbGV0IGNhbU9sZCA9IHZlYzMod2luZG93LmFuaW0uY2FtZXJhLmxvYyk7XHJcbiAgICAgIGxldCBjYW1OZXcgPSBwb3MuYWRkKGRpci5tdWwoLTE4KS5hZGQobm9ybS5tdWwoOCkpKTtcclxuICAgICAgd2luZG93LmFuaW0uY2FtZXJhLnNldChcclxuICAgICAgICBjYW1PbGQuYWRkKFxyXG4gICAgICAgICAgY2FtTmV3LnN1YihjYW1PbGQpLm11bChNYXRoLnNxcnQod2luZG93LmFuaW0udGltZXIuZ2xvYmFsRGVsdGFUaW1lKSlcclxuICAgICAgICApLFxyXG4gICAgICAgIHBvcy5hZGQoZGlyLm11bCgxOCkpLmFkZChub3JtLm11bCgtOCkpLFxyXG4gICAgICAgIG5vcm1cclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJlbmRlcigpIHtcclxuICAgIGdsLmNsZWFyQ29sb3IoMC4zLCAwLjQ3LCAwLjgsIDEpO1xyXG4gICAgZ2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCk7XHJcbiAgICBnbC5lbmFibGUoZ2wuREVQVEhfVEVTVCk7XHJcblxyXG5cclxuICAgIHRoaXMuZmxvb3IuZHJhdygpO1xyXG4gICAgdGhpcy5kcmF3V2FsbHMoKTtcclxuICAgIHRoaXMuY3JlYXRlU2VsZklmTm90RXhpc3RzKCk7XHJcblxyXG4gICAgLy8gRHJhdyBwbGF5ZXJzXHJcbiAgICB0aGlzLnVwZGF0ZVBsYXllcnMoKTtcclxuICAgIHRoaXMuZHJhd1NlbGYoKTtcclxuICAgIHRoaXMuZHJhd090aGVyKCk7XHJcblxyXG4gICAgLy8gRHJhdyBzY29wZVxyXG4gICAgdGhpcy5zY29wZVByaW0uZHJhdygpO1xyXG4gIH1cclxufVxyXG4iLCIvLyBDb2xsaXNpb24gZGV0ZWN0aW9uIGltcGxlbWVudGF0aW9uIGZpbGVcclxuaW1wb3J0IHsgdmVjMyB9IGZyb20gXCIuL3ZlYzMuanNcIjtcclxuXHJcbi8vIFJheSBjbGFzcyBtb2R1bGVcclxuY2xhc3MgX3JheSB7XHJcbiAgY29uc3RydWN0b3Iob3JnLCBkaXIpIHtcclxuICAgIHRoaXMub3JnID0gdmVjMyhvcmcpO1xyXG4gICAgdGhpcy5kaXIgPSB2ZWMzKGRpcikubm9ybWFsaXplKCk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmF5KC4uLmFyZ3MpIHtcclxuICByZXR1cm4gbmV3IF9yYXkoLi4uYXJncyk7XHJcbn1cclxuXHJcbi8vIFNwaGVyZSBjbGFzcyBtb2R1bGVcclxuY2xhc3MgX3NwaGVyZSB7XHJcbiAgY29uc3RydWN0b3IoY2VudGVyLCByYWRpdXMpIHtcclxuICAgIHRoaXMuYyA9IGNlbnRlcjtcclxuICAgIHRoaXMuciA9IHJhZGl1cztcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzcGhlcmUoLi4uYXJncykge1xyXG4gIHJldHVybiBuZXcgX3NwaGVyZSguLi5hcmdzKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJheUludGVyc2VjdFNwaGVyZShyYXksIHNwaGVyZSkge1xyXG4gIGNvbnN0IG9yZ0NlbnRlciA9IHNwaGVyZS5jLnN1YihyYXkub3JnKTtcclxuICBjb25zdCB0ID0gb3JnQ2VudGVyLmRvdChyYXkuZGlyKTtcclxuICBjb25zdCBkMiA9IG9yZ0NlbnRlci5sZW5ndGgyKCkgLSB0ICogdDtcclxuXHJcbiAgaWYgKG9yZ0NlbnRlci5kb3QocmF5LmRpcikgPD0gMCkgcmV0dXJuIGZhbHNlO1xyXG4gIGlmIChkMiA+PSBzcGhlcmUuciAqIHNwaGVyZS5yKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tDb2xsaXNpb25TcGhlcmVBbmRTcGhlcmUocG9zMSwgcmFkMSwgcG9zMiwgcmFkMikge1xyXG4gIGlmIChNYXRoLnBvdyhwb3MyLnggLSBwb3MxLngsIDIpICsgTWF0aC5wb3cocG9zMi55IC0gcG9zMS55LCAyKSArIE1hdGgucG93KHBvczIueiAtIHBvczEueiwgMikgPD0gTWF0aC5wb3cocmFkMSArIHJhZDIsIDIpKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrQ29sbGlzaW9uU3BoZXJlQW5kQm94KGJtaW4sIGJtYXgsIGMsIHIpIHtcclxuICBsZXQgcjIgPSByICogcjtcclxuICBsZXQgZG1pbiA9IDA7XHJcblxyXG4gIGMgPSBbYy54LCBjLnksIGMuel07XHJcbiAgYm1pbiA9IFtibWluLngsIGJtaW4ueSwgYm1pbi56XTtcclxuICBibWF4ID0gW2JtYXgueCwgYm1heC55LCBibWF4LnpdO1xyXG5cclxuICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xyXG4gICAgaWYgKGNbaV0gPCBibWluW2ldKSB7XHJcbiAgICAgIGRtaW4gKz0gTWF0aC5wb3coY1tpXSAtIGJtaW5baV0sIDIpO1xyXG4gICAgfSBlbHNlIGlmIChjW2ldID4gYm1heFtpXSkge1xyXG4gICAgICBkbWluICs9IE1hdGgucG93KGNbaV0gLSBibWF4W2ldLCAyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChkbWluIDw9IHIyKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcbiIsIi8vIElucHV0IHN5c3RlbSBpbXBsZW1lbnRhdGlvbiBmaWxlXHJcbmltcG9ydCB7IHZlYzMgfSBmcm9tIFwiLi4vbXRoL3ZlYzMuanNcIjtcclxuaW1wb3J0IHsgbWF0NCB9IGZyb20gXCIuLi9tdGgvbWF0NC5qc1wiO1xyXG5pbXBvcnQgeyByYXlJbnRlcnNlY3RTcGhlcmUsIHJheSwgc3BoZXJlIH0gZnJvbSBcIi4uL210aC9jb2xsaXNpb24uanNcIjtcclxuaW1wb3J0ICogYXMgY29sIGZyb20gXCIuLi9tdGgvY29sbGlzaW9uLmpzXCI7XHJcbmltcG9ydCB7d2FsbHMsIG1hemVQb3N9IGZyb20gXCIuLi9hbmltL3JuZC9yZW5kZXIuanNcIjtcclxuXHJcbmNsYXNzIF9jb250cm9sIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuZGlyID0gdmVjMygwLCAwLCAtMSk7XHJcbiAgICB0aGlzLnBvcyA9IHZlYzMoMCk7XHJcbiAgICB0aGlzLnBvc09sZCA9IHZlYzMoMCk7XHJcbiAgICB0aGlzLmRlbHRhUG9zID0gdmVjMygwKTtcclxuICAgIHRoaXMubm9ybSA9IHZlYzMoMCwgMSwgMCk7XHJcbiAgICB0aGlzLnJpZ2h0ID0gdmVjMygxLCAwLCAwKTtcclxuICAgIHRoaXMuc3BlZWQgPSA1My4wO1xyXG4gIH1cclxuICByZXNwb25zZSgpIHtcclxuICAgIHRoaXMuZGlyID0gdGhpcy5kaXJcclxuICAgICAgLm11bE1hdHIoXHJcbiAgICAgICAgbWF0NCgpXHJcbiAgICAgICAgICAucm90YXRlWSh3aW5kb3cuYW5pbS50aW1lci5nbG9iYWxEZWx0YVRpbWUgKiAtMTggKiB3aW5kb3cubW91c2VEeClcclxuICAgICAgICAgIC5yb3RhdGUoXHJcbiAgICAgICAgICAgIHdpbmRvdy5hbmltLnRpbWVyLmdsb2JhbERlbHRhVGltZSAqIC0wLjEgKiB3aW5kb3cubW91c2VEeSxcclxuICAgICAgICAgICAgdGhpcy5yaWdodFxyXG4gICAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICAgIC5ub3JtYWxpemUoKTtcclxuXHJcbiAgICBpZiAod2luZG93LnBsYXllciAhPT0gbnVsbCkge1xyXG4gICAgICB0aGlzLmRlbHRhUG9zID0gdmVjMygwKTtcclxuICAgICAgaWYgKHdpbmRvdy5hY3RpdmVCdXR0b25zLmluY2x1ZGVzKFwiS2V5V1wiKSkge1xyXG4gICAgICAgIHRoaXMuZGVsdGFQb3MgPSB0aGlzLmRpci5tdWwoXHJcbiAgICAgICAgICB3aW5kb3cuYW5pbS50aW1lci5nbG9iYWxEZWx0YVRpbWUgKiB0aGlzLnNwZWVkXHJcbiAgICAgICAgKTtcclxuICAgICAgICB0aGlzLmRlbHRhUG9zLnkgPSAwO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh3aW5kb3cuYWN0aXZlQnV0dG9ucy5pbmNsdWRlcyhcIktleVNcIikpIHtcclxuICAgICAgICB0aGlzLmRlbHRhUG9zID0gdGhpcy5kaXIubXVsKFxyXG4gICAgICAgICAgLXdpbmRvdy5hbmltLnRpbWVyLmdsb2JhbERlbHRhVGltZSAqIHRoaXMuc3BlZWRcclxuICAgICAgICApO1xyXG4gICAgICAgIHRoaXMuZGVsdGFQb3MueSA9IDA7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHdpbmRvdy5hY3RpdmVCdXR0b25zLmluY2x1ZGVzKFwiS2V5RFwiKSkge1xyXG4gICAgICAgIHRoaXMuZGVsdGFQb3MgPSB0aGlzLmRpclxyXG4gICAgICAgICAgLmNyb3NzKHRoaXMubm9ybSlcclxuICAgICAgICAgIC5tdWwod2luZG93LmFuaW0udGltZXIuZ2xvYmFsRGVsdGFUaW1lICogdGhpcy5zcGVlZCAvIDMuMCk7XHJcbiAgICAgICAgdGhpcy5kZWx0YVBvcy55ID0gMDtcclxuICAgICAgfVxyXG4gICAgICBpZiAod2luZG93LmFjdGl2ZUJ1dHRvbnMuaW5jbHVkZXMoXCJLZXlBXCIpKSB7XHJcbiAgICAgICAgdGhpcy5kZWx0YVBvcyA9IHRoaXMuZGlyXHJcbiAgICAgICAgICAuY3Jvc3ModGhpcy5ub3JtKVxyXG4gICAgICAgICAgLm11bCgtd2luZG93LmFuaW0udGltZXIuZ2xvYmFsRGVsdGFUaW1lICogdGhpcy5zcGVlZCAvIDMuMCk7XHJcbiAgICAgICAgdGhpcy5kZWx0YVBvcy55ID0gMDtcclxuICAgICAgfVxyXG4gICAgICBpZiAod2luZG93LmlzQ2xpY2tlZCkge1xyXG4gICAgICAgIGxldCByID0gcmF5KHdpbmRvdy5hbmltLmNhbWVyYS5sb2MsIHdpbmRvdy5hbmltLmNhbWVyYS5kaXIpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2luZG93Lm90aGVyUGxheWVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgbGV0IHNwaCA9IHNwaGVyZShcclxuICAgICAgICAgICAgdmVjMyhcclxuICAgICAgICAgICAgICB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLngsXHJcbiAgICAgICAgICAgICAgd2luZG93Lm90aGVyUGxheWVyc1tpXS55LFxyXG4gICAgICAgICAgICAgIHdpbmRvdy5vdGhlclBsYXllcnNbaV0uelxyXG4gICAgICAgICAgICApLFxyXG4gICAgICAgICAgICAzLjBcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBpZiAocmF5SW50ZXJzZWN0U3BoZXJlKHIsIHNwaCkpIHtcclxuICAgICAgICAgICAgd2luZG93LnNvY2tldC5lbWl0KFxyXG4gICAgICAgICAgICAgIFwiTVRTOlBsYXllcl9TaG9vdF9QbGF5ZXJcIixcclxuICAgICAgICAgICAgICBbXHJcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh3aW5kb3cucGxheWVyKSxcclxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHdpbmRvdy5vdGhlclBsYXllcnNbaV0pLFxyXG4gICAgICAgICAgICAgIF0uam9pbihcInxcIilcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMucG9zID0gdGhpcy5wb3NPbGQuYWRkKHRoaXMuZGVsdGFQb3MpO1xyXG4gICAgICB0aGlzLnJpZ2h0ID0gdGhpcy5kaXIuY3Jvc3ModGhpcy5ub3JtKS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgIGxldCBmbGFnID0gMDtcclxuXHJcbiAgICAgIC8vY2hlY2sgY29sbGlzaW9uIHBsYXllci1vdGhlciBwbGF5ZXJzXHJcbiAgICAgIGlmICh3aW5kb3cub3RoZXJQbGF5ZXJzICE9PSBudWxsKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3aW5kb3cub3RoZXJQbGF5ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAoY29sLmNoZWNrQ29sbGlzaW9uU3BoZXJlQW5kU3BoZXJlKHZlYzModGhpcy5wb3MueCwgdGhpcy5wb3MueSwgdGhpcy5wb3MueiksIDMsIHZlYzMod2luZG93Lm90aGVyUGxheWVyc1tpXS54LCB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLnksIHdpbmRvdy5vdGhlclBsYXllcnNbaV0ueiksIDMpKSB7XHJcbiAgICAgICAgICAgIHdoaWxlKGNvbC5jaGVja0NvbGxpc2lvblNwaGVyZUFuZFNwaGVyZSh2ZWMzKHRoaXMucG9zLngsIHRoaXMucG9zLnksIHRoaXMucG9zLnopLCAzLCB2ZWMzKHdpbmRvdy5vdGhlclBsYXllcnNbaV0ueCwgd2luZG93Lm90aGVyUGxheWVyc1tpXS55LCB3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLnopLCAzKSkge1xyXG4gICAgICAgICAgICAgIGlmIChNYXRoLmFicyh0aGlzLmRlbHRhUG9zLngpID09PSAwICYmIE1hdGguYWJzKHRoaXMuZGVsdGFQb3MueSkgPT09IDAgJiYgTWF0aC5hYnModGhpcy5kZWx0YVBvcy56KSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kZWx0YVBvcy54ID0gMTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb3MgPSB0aGlzLnBvcy5zdWIodGhpcy5kZWx0YVBvcyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvL2NoZWNrIGNvbGxpc2lvbiBwbGF5ZXItd2FsbHNcclxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3YWxscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChjb2wuY2hlY2tDb2xsaXNpb25TcGhlcmVBbmRCb3gobWF6ZVBvc1tpXVswXSwgbWF6ZVBvc1tpXVsxXSwgdmVjMyh0aGlzLnBvcy54LCB0aGlzLnBvcy55LCB0aGlzLnBvcy56KSwgMykpIHtcclxuICAgICAgICAgIHdoaWxlKGNvbC5jaGVja0NvbGxpc2lvblNwaGVyZUFuZEJveChtYXplUG9zW2ldWzBdLCBtYXplUG9zW2ldWzFdLCB2ZWMzKHRoaXMucG9zLngsIHRoaXMucG9zLnksIHRoaXMucG9zLnopLCAzKSkge1xyXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnModGhpcy5kZWx0YVBvcy54KSA9PT0gMCAmJiBNYXRoLmFicyh0aGlzLmRlbHRhUG9zLnkpID09PSAwICYmIE1hdGguYWJzKHRoaXMuZGVsdGFQb3MueikgPT09IDApIHtcclxuICAgICAgICAgICAgICB0aGlzLmRlbHRhUG9zLnggPSAxO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRoaXMucG9zID0gdGhpcy5wb3Muc3ViKHRoaXMuZGVsdGFQb3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnBvc09sZCA9IHRoaXMucG9zO1xyXG4gICAgICBpZiAoZmxhZyA9PT0gMCkge1xyXG4gICAgICAgIHdpbmRvdy5wbGF5ZXIueCA9IHRoaXMucG9zLng7XHJcbiAgICAgICAgd2luZG93LnBsYXllci55ID0gdGhpcy5wb3MueTtcclxuICAgICAgICB3aW5kb3cucGxheWVyLnogPSB0aGlzLnBvcy56O1xyXG5cclxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKHRoaXMuZGlyKTtcclxuICAgICAgICBsZXQgY2FtT2xkID0gdmVjMyh3aW5kb3cuYW5pbS5jYW1lcmEubG9jKTtcclxuICAgICAgICBsZXQgY2FtTmV3ID0gdGhpcy5wb3MuYWRkKHRoaXMuZGlyLm11bCgtMTgpLmFkZCh0aGlzLm5vcm0ubXVsKDgpKSk7XHJcbiAgICAgICAgd2luZG93LmFuaW0uY2FtZXJhLnNldChcclxuICAgICAgICAgIGNhbU9sZC5hZGQoXHJcbiAgICAgICAgICAgIGNhbU5ld1xyXG4gICAgICAgICAgICAgIC5zdWIoY2FtT2xkKVxyXG4gICAgICAgICAgICAgIC5tdWwoXHJcbiAgICAgICAgICAgICAgICBNYXRoLnNxcnQoXHJcbiAgICAgICAgICAgICAgICAgIHdpbmRvdy5tb3VzZUR4ICsgd2luZG93Lm1vdXNlRHkgIT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgID8gd2luZG93LmFuaW0udGltZXIuZ2xvYmFsRGVsdGFUaW1lICogMC41XHJcbiAgICAgICAgICAgICAgICAgICAgOiAxXHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKSxcclxuICAgICAgICAgIHRoaXMucG9zXHJcbiAgICAgICAgICAgIC5hZGQodGhpcy5kaXIubXVsKDE4KSlcclxuICAgICAgICAgICAgLmFkZCh0aGlzLm5vcm0ubXVsKDAuNTMpKVxyXG4gICAgICAgICAgICAuYWRkKHRoaXMuZGlyLmNyb3NzKHRoaXMubm9ybSkubXVsKC0xMCkpLFxyXG4gICAgICAgICAgdGhpcy5ub3JtXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICB3aW5kb3cuc29ja2V0LmVtaXQoXHJcbiAgICAgICAgXCJNVFM6Q2hhbmdlX1BsYXllcl9TdGF0ZVwiLFxyXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHdpbmRvdy5wbGF5ZXIpXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICB3aW5kb3cubW91c2VEeCA9IDA7XHJcbiAgICB3aW5kb3cubW91c2VEeSA9IDA7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29udHJvbCguLi5hcmdzKSB7XHJcbiAgcmV0dXJuIG5ldyBfY29udHJvbCguLi5hcmdzKTtcclxufVxyXG4iLCJpbXBvcnQgeyBUaW1lciB9IGZyb20gXCIuL3RpbWVyLmpzXCI7XHJcbmltcG9ydCB7IFJlbmRlciB9IGZyb20gXCIuL3JuZC9yZW5kZXIuanNcIjtcclxuaW1wb3J0IHsgY2FtZXJhIH0gZnJvbSBcIi4uL210aC9jYW1lcmEuanNcIjtcclxuaW1wb3J0IHsgY2FudmFzIH0gZnJvbSBcIi4uL2dsLmpzXCI7XHJcbmltcG9ydCB7IGNvbnRyb2wgfSBmcm9tIFwiLi9pbnB1dC5qc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFuaW0ge1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy50aW1lciA9IG5ldyBUaW1lcigpO1xyXG4gICAgdGhpcy5yZW5kZXIgPSBuZXcgUmVuZGVyKCk7XHJcbiAgICB0aGlzLmNhbWVyYSA9IGNhbWVyYSgpO1xyXG4gICAgdGhpcy5jb250cm9sID0gY29udHJvbCgpO1xyXG4gIH1cclxuICByZXNwb25zZSgpIHtcclxuICAgIHRoaXMudGltZXIucmVzcG9uc2UoKTtcclxuICAgIHRoaXMuY29udHJvbC5yZXNwb25zZSgpO1xyXG4gIH1cclxuICBkcmF3KCkge1xyXG4gICAgdGhpcy5jYW1lcmEuc2V0U2l6ZShjYW52YXMuY2xpZW50V2lkdGgsIGNhbnZhcy5jbGllbnRIZWlnaHQpO1xyXG4gICAgdGhpcy5yZW5kZXIucmVuZGVyKCk7XHJcbiAgfVxyXG59XHJcbiIsIi8vIE1haW4gbW9kdWxlXHJcbmltcG9ydCB7IEFuaW0gfSBmcm9tIFwiLi9hbmltL2FuaW1hdGlvbi5qc1wiO1xyXG4vLyBpbXBvcnQgeyBSZW5kZXIgfSBmcm9tIFwiLi9hbmltL3JuZC9yZW5kZXIuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWluKCkge1xyXG4gIHdpbmRvdy5hbmltID0gbmV3IEFuaW0oKTtcclxuICBQcm9taXNlLmFsbChbXHJcbiAgICB3aW5kb3cuYW5pbS5yZW5kZXIuc2hhZGVyRGVmYXVsdC52ZXJ0VGV4dCxcclxuICAgIHdpbmRvdy5hbmltLnJlbmRlci5zaGFkZXJEZWZhdWx0LmZyYWdUZXh0LFxyXG4gICAgd2luZG93LmFuaW0ucmVuZGVyLnNoYWRlclNjb3BlLnZlcnRUZXh0LFxyXG4gICAgd2luZG93LmFuaW0ucmVuZGVyLnNoYWRlclNjb3BlLmZyYWdUZXh0LFxyXG4gIF0pLnRoZW4oKHJlcykgPT4ge1xyXG4gICAgY29uc3QgdnNkID0gcmVzWzBdO1xyXG4gICAgY29uc3QgZnNkID0gcmVzWzFdO1xyXG4gICAgY29uc3QgdnNzID0gcmVzWzJdO1xyXG4gICAgY29uc3QgZnNzID0gcmVzWzNdO1xyXG5cclxuICAgIHdpbmRvdy5hbmltLnJlbmRlci5zaGFkZXJEZWZhdWx0LmFkZCh2c2QsIGZzZCk7XHJcbiAgICB3aW5kb3cuYW5pbS5yZW5kZXIuc2hhZGVyU2NvcGUuYWRkKHZzcywgZnNzKTtcclxuICAgIHdpbmRvdy5hbmltLnJlbmRlci5yZXNJbml0KCk7XHJcblxyXG4gICAgY29uc3QgZHJhdyA9ICgpID0+IHtcclxuICAgICAgd2luZG93LmFuaW0ucmVzcG9uc2UoKTtcclxuICAgICAgd2luZG93LmFuaW0uZHJhdygpO1xyXG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRyYXcpO1xyXG4gICAgfTtcclxuICAgIGRyYXcoKTtcclxuICB9KTtcclxufVxyXG4iLCJpbXBvcnQgeyBpbyB9IGZyb20gXCJzb2NrZXQuaW8tY2xpZW50XCI7XHJcbmltcG9ydCB7IG1haW4gfSBmcm9tIFwiLi9zcmMvbWFpbi5qc1wiO1xyXG5pbXBvcnQgeyBjYW52YXMgfSBmcm9tIFwiLi9zcmMvZ2wuanNcIjtcclxuXHJcbndpbmRvdy5zb2NrZXQgPSBpbygpO1xyXG53aW5kb3cuYWN0aXZlQnV0dG9ucyA9IFtdO1xyXG5cclxuLy8gTW91c2UgZGF0YVxyXG53aW5kb3cubW91c2VYID0gMDtcclxud2luZG93Lm1vdXNlWE9sZCA9IDA7XHJcbndpbmRvdy5tb3VzZUR4ID0gMDtcclxud2luZG93Lm1vdXNlWSA9IDA7XHJcbndpbmRvdy5tb3VzZVlPbGQgPSAwO1xyXG53aW5kb3cubW91c2VEeSA9IDA7XHJcbndpbmRvdy5pc0NsaWNrZWQgPSBmYWxzZTtcclxuXHJcbmZ1bmN0aW9uIGFkZEluZm9CbG9jaygpIHtcclxuICBsZXQgYmxvY2sgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndyYXBcIik7XHJcbiAgYmxvY2suaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcbiAgaWYgKHdpbmRvdy5vdGhlclBsYXllcnMgIT09IG51bGwpIHtcclxuICBibG9jay5pbnNlcnRBZGphY2VudEhUTUwoXCJiZWZvcmVlbmRcIiwgYDxkaXYgY2xhc3M9XCJwZXJzb25cIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6IGJsYWNrO1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwZXJzLWNvbG9yXCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAke3dpbmRvdy5wbGF5ZXIuY29sb3J9O1wiPjwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwZXJzLW5hbWVcIj4ke3dpbmRvdy5wbGF5ZXIubmFtZX08L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicGVycy1zdGF0XCI+JHt3aW5kb3cucGxheWVyLmhlYWx0aH0vMTAwPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCk7XHJcbiAgfVxyXG4gIFxyXG4gIGlmICh3aW5kb3cub3RoZXJQbGF5ZXJzICE9PSBudWxsKSB7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdpbmRvdy5vdGhlclBsYXllcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgYmxvY2suaW5zZXJ0QWRqYWNlbnRIVE1MKFwiYmVmb3JlZW5kXCIsIGA8ZGl2IGNsYXNzPVwicGVyc29uXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicGVycy1jb2xvclwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogJHt3aW5kb3cub3RoZXJQbGF5ZXJzW2ldLmNvbG9yfTtcIj48L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwZXJzLW5hbWVcIj4ke3dpbmRvdy5vdGhlclBsYXllcnNbaV0ubmFtZX08L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwZXJzLXN0YXRcIj4ke3dpbmRvdy5vdGhlclBsYXllcnNbaV0uaGVhbHRofS8xMDA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBtYWluQ2xpZW50KCkge1xyXG4gIC8vIGNsaWVudC1zaWRlXHJcbiAgd2luZG93LnNvY2tldC5vbihcImNvbm5lY3RcIiwgKCkgPT4ge1xyXG4gICAgY29uc29sZS5sb2cod2luZG93LnNvY2tldC5pZCk7IC8vIHg4V0l2Ny1tSmVsZzdvbl9BTGJ4XHJcbiAgfSk7XHJcblxyXG4gIHdpbmRvdy5zb2NrZXQub24oXCJNRlM6T3RoZXJfUGxheWVyc1wiLCBmdW5jdGlvbihtc2cpIHtcclxuICAgIGxldCB0bXBQbGF5ZXJzID0gbXNnLnNwbGl0KCd8Jyk7XHJcbiAgICB3aW5kb3cub3RoZXJQbGF5ZXJzID0gW107XHJcbiAgICBcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG1wUGxheWVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAodG1wUGxheWVyc1tpXSAhPT0gXCJcIikge1xyXG4gICAgICAgIHdpbmRvdy5vdGhlclBsYXllcnMucHVzaChKU09OLnBhcnNlKHRtcFBsYXllcnNbaV0pKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgYWRkSW5mb0Jsb2NrKCk7XHJcbiAgfSk7XHJcblxyXG4gIHdpbmRvdy5zb2NrZXQub24oXCJNRlM6R2V0X1BsYXllclwiLCBmdW5jdGlvbihtc2cpIHtcclxuICAgIHdpbmRvdy5wbGF5ZXIgPSBKU09OLnBhcnNlKG1zZyk7XHJcbiAgICBhZGRJbmZvQmxvY2soKTtcclxuICB9KTtcclxuXHJcbiAgd2luZG93LnNvY2tldC5vbihcIk1GUzpJbnZhbGlkX05hbWVcIiwgKG1zZykgPT4ge1xyXG4gICAgbGV0IHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb29tU2hvd1wiKTtcclxuICAgIGxldCBtZXMgPSBtc2cuc3BsaXQoXCJ8XCIpO1xyXG5cclxuICAgIHRpdGxlLmlubmVyVGV4dCA9IGB0aGlzIG5hbWUgaGFkIGFscmVhZHkgdGFrZW5gO1xyXG4gICAgdGl0bGUuc3R5bGUuY29sb3IgPSBcInJlZFwiO1xyXG4gICAgdGl0bGUuc3R5bGUuZm9udFN0eWxlID0gXCJpdGFsaWNcIjtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhcnRcIikudmFsdWUgPSBcIkdPIVwiO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5ZXJOYW1lXCIpLnZhbHVlID0gbWVzWzBdO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb29tXCIpLnZhbHVlID0gbWVzWzFdO1xyXG4gIH0pO1xyXG5cclxuICB3aW5kb3cuc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XHJcbiAgICBjb25zb2xlLmxvZyh3aW5kb3cuc29ja2V0LmlkKTsgLy8gdW5kZWZpbmVkXHJcbiAgfSk7XHJcblxyXG4gIHdpbmRvdy5zb2NrZXQub24oXCJNRlM6R2FtZV9PdmVyXCIsICgpID0+IHtcclxuICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcclxuICB9KTtcclxuXHJcbiAgLy9DUkVBVEUgUExBWUVSXHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdGFydFwiKS5vbmNsaWNrID0gKCkgPT4ge1xyXG4gICAgaWYgKHdpbmRvdy5wbGF5ZXIgPT09IG51bGwpIHtcclxuICAgICAgbGV0IHBsYXllck5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllck5hbWVcIikudmFsdWU7XHJcbiAgICAgIGxldCBwbGF5ZXJSb29tID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb29tXCIpLnZhbHVlO1xyXG4gICAgICBsZXQgdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJvb21TaG93XCIpO1xyXG5cclxuICAgICAgaWYgKHBsYXllck5hbWUgIT09IFwiXCIgJiYgcGxheWVyUm9vbSAhPT0gXCJcIiAmJiAhcGxheWVyTmFtZS5pbmNsdWRlcyhcIiBcIikgJiYgIXBsYXllclJvb20uaW5jbHVkZXMoXCIgXCIpKSB7XHJcbiAgICAgICAgd2luZG93LnNvY2tldC5lbWl0KFwiTVRTOlBsYXllcl9TZXR0aW5nc1wiLCBbcGxheWVyTmFtZSwgcGxheWVyUm9vbV0uam9pbignfCcpKTtcclxuICAgICAgICB0aXRsZS5pbm5lclRleHQgPSBgWW91ciByb29tIGlzICcke3BsYXllclJvb219J2A7XHJcbiAgICAgICAgdGl0bGUuc3R5bGUuY29sb3IgPSBcImFsaWNlYmx1ZVwiO1xyXG4gICAgICAgIHRpdGxlLnN0eWxlLmZvbnRTdHlsZSA9IFwibm9ybWFsXCI7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdGFydFwiKS52YWx1ZSA9IFwiTEVBVkVcIjtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllck5hbWVcIikudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vbVwiKS52YWx1ZSA9IFwiXCI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGl0bGUuaW5uZXJUZXh0ID0gYGludmFsaWQgcm9vbSBvciBwbGF5ZXIgbmFtZWA7XHJcbiAgICAgICAgdGl0bGUuc3R5bGUuY29sb3IgPSBcInJlZFwiO1xyXG4gICAgICAgIHRpdGxlLnN0eWxlLmZvbnRTdHlsZSA9IFwiaXRhbGljXCI7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIFxyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldmVudCkgPT4ge1xyXG4gICAgaWYgKCF3aW5kb3cuYWN0aXZlQnV0dG9ucy5pbmNsdWRlcyhldmVudC5jb2RlKSlcclxuICAgICAgd2luZG93LmFjdGl2ZUJ1dHRvbnMucHVzaChldmVudC5jb2RlKTtcclxuICB9KTtcclxuXHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjdXJzb3JcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgIGF3YWl0IGNhbnZhcy5yZXF1ZXN0UG9pbnRlckxvY2soeyB1bmFkanVzdGVkTW92ZW1lbnQ6IHRydWUgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZXZlbnQpID0+IHtcclxuICAgIGlmICh3aW5kb3cuYWN0aXZlQnV0dG9ucy5pbmNsdWRlcyhldmVudC5jb2RlKSlcclxuICAgICAgd2luZG93LmFjdGl2ZUJ1dHRvbnMuc3BsaWNlKHdpbmRvdy5hY3RpdmVCdXR0b25zLmluZGV4T2YoZXZlbnQuY29kZSksIDEpO1xyXG4gIH0pO1xyXG5cclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIChldmVudCkgPT4ge1xyXG4gICAgd2luZG93Lm1vdXNlRHggPSBldmVudC5tb3ZlbWVudFg7XHJcbiAgICB3aW5kb3cubW91c2VEeSA9IGV2ZW50Lm1vdmVtZW50WTtcclxuICB9KTtcclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsICgpID0+IHtcclxuICAgIHdpbmRvdy5pc0NsaWNrZWQgPSB0cnVlO1xyXG4gIH0pO1xyXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsICgpID0+IHtcclxuICAgIHdpbmRvdy5pc0NsaWNrZWQgPSBmYWxzZTtcclxuICB9KTtcclxufVxyXG5cclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIChldmVudCkgPT4ge1xyXG4gIHdpbmRvdy5wbGF5ZXIgPSBudWxsO1xyXG4gIHdpbmRvdy5vdGhlclBsYXllcnMgPSBudWxsO1xyXG5cclxuICBtYWluQ2xpZW50KCk7XHJcbiAgbWFpbigpO1xyXG59KTsiXSwibmFtZXMiOlsid2l0aE5hdGl2ZUJsb2IiLCJ3aXRoTmF0aXZlQXJyYXlCdWZmZXIiLCJpc1ZpZXciLCJsb29rdXAiLCJkZWNvZGUiLCJwcm90b2NvbCIsImdsb2JhbFRoaXMiLCJlbmNvZGUiLCJYTUxIdHRwUmVxdWVzdCIsIlNvY2tldCIsIlJFU0VSVkVEX0VWRU5UUyIsIkVuZ2luZSIsInZlYzMiLCJzaGQuc2hhZGVycyIsInNoZC5zaGFkZXIiLCJtdGwubWF0ZXJpYWxzIiwibXRsLm1hdGVyaWFsIiwidGV4LnRleHR1cmUiLCJtdGwubG9hZE10bExpYiIsIm10bC5maW5kTXRsQnlOYW1lIiwiY29sLmNoZWNrQ29sbGlzaW9uU3BoZXJlQW5kU3BoZXJlIiwiY29sLmNoZWNrQ29sbGlzaW9uU3BoZXJlQW5kQm94IiwiaW8iXSwibWFwcGluZ3MiOiI7OztJQUFBLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUMzQixZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQzVCLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDM0IsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUMzQixZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQzlCLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDOUIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUMzQixNQUFNLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakQsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJO0lBQ3pDLElBQUksb0JBQW9CLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxZQUFZLEdBQUcsRUFB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LEtBQUssQ0FBQyxDQUFDO0FBQy9DO0lBQ0EsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUM3QyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLEdBQUc7QUFDSDtJQUNBLEVBQUUsSUFBSSxTQUFTLEVBQUU7SUFDakIsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUU7SUFDMUQsTUFBTSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyQyxLQUFLO0lBQ0wsR0FBRztBQUNIO0lBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQztBQUNGO0lBQ0E7SUFDQSxPQUFPLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztBQUN4RDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0FBQ0E7SUFDQSxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxTQUFTLEtBQUssQ0FBQztJQUM3QyxFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUM7SUFDMUMsRUFBRSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM1QyxDQUFDLENBQUM7QUFDRjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0FBQ0E7SUFDQSxPQUFPLENBQUMsU0FB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LElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDNUIsWUFBWSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUMzQixTQUFTO0lBQ1QsS0FBSztJQUNMO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLEdBQUcsR0FBRztJQUNWLFFBQVEsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7SUFDckMsUUFBUSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ3ZELFFBQVEsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ3RCO0lBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtJQUMxQixhQUFhLENBQUMsS0FBSyxLQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHO0lBQ2hFLGlCQUFpQixJQUFJLEtBQUssTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUU7SUFDckUsWUFBWSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3hDLFNBQVM7SUFDVDtJQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO0lBQ3pDLFlBQVksS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUM7SUFDdEQsU0FBUztJQUNUO0lBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtJQUNsQyxZQUFZLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLFNBQVM7SUFDVCxRQUFRLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQyxRQUFRLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM1RCxRQUFRLFFBQVEsTUFBTTtJQUN0QixZQUFZLEtBQUs7SUFDakIsYUFBYSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN4RSxZQUFZLElBQUk7SUFDaEIsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7SUFDMUIsYUFBYSxZQUFZLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxZQUFZLEdBQUcsRUFBRSxDQUFDLEVBQUU7SUFDN0QsS0FBSztJQUNMO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksS0FBSyxHQUFHO0lBQ1osUUFBUSxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDM0IsS0FBSztJQUNMOztJQ3BLTyxNQUFNLFVBQVUsR0FBRztJQUMxQixJQUFJLFNBQVMsRUFBRSxFQUFFO0lBQ2pCLElBQUksT0FBTyxFQUFFLE9BQU87SUFDcEIsQ0FBQzs7SUNMRDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLE1BQU0sRUFBRSxHQUFHLHFQQUFxUCxDQUFDO0lBQ2pRLE1BQU0sS0FBSyxHQUFHO0lBQ2QsSUFBSSxRQUFRLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUTtJQUNqSixDQUFDLENBQUM7SUFDSyxTQUFTLEtBQUssQ0FBQyxHQUFHLEVBQUU7SUFDM0IsSUFBSSxNQUFNLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDaEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDNUIsUUFBUSxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUcsS0FBSztJQUNMLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2pELElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRTtJQUNoQixRQUFRLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ25DLEtBQUs7SUFDTCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtJQUM1QixRQUFRLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRixRQUFRLEdBQUcsQ0FB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QUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxZQUFZO0lBQ3pDLElBQUksSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDOUQsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7SUFDckIsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDakMsUUFBUSxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzVELFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFDaEYsS0FBSztJQUNMLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQztJQUNGO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxZQUFZO0lBQ3RDLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDdEIsQ0FBQyxDQUFDO0lBQ0Y7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFVBQVUsR0FBRyxFQUFFO0lBQzFDLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFDbEIsQ0FBQyxDQUFDO0lBQ0Y7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFVBQVUsR0FBRyxFQUFFO0lBQzFDLElBQUks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QyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDeEUsU0FBUztJQUNULFFBQVEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsS0FBSztJQUNMO0lBQ0EsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFO0lBQ2IsUUFBUTtJQUNSLFlBQVksSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUM3RSxVQUFVO0lBQ1YsS0FBSztJQUNMO0lBQ0EsSUFBSSxNQUFNLEdBQUc7SUFDYixRQUFRLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakM7SUFDQSxRQUFRLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLE9BQU8sR0FBRyxDQUFDO0lBQzdDLFFBQVEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLEtBQUs7SUFDTDtJQUNBLElBQUksT0FBTyxHQUFHO0lBQ2QsUUFBUSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsS0FBSztJQUNMO0lBQ0EsSUFBSSxTQUFTLEdBQUc7SUFDaEIs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QUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsT0FBTztJQUNQLE1BQU07SUFDTixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxPQUFPO0lBQ1AsTUFBTTtJQUNOLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLE9BQU87SUFDUCxNQUFNO0lBQ04sUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsT0FBTztJQUNQLEtBQUssQ0FBQztJQUNOLElBQUksT0FBTyxJQUFJLENBQUM7SUFDaEIsR0FBRztBQUNIO0lBQ0E7SUFDQSxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUMzQixJQUFJLElBQUksT0FBTyxFQUFFLElBQUksUUFBUSxFQUFFO0lBQy9CLE1BQU0sSUFBSSxDQUFDLENBQUMsR0FBRztJQUNmLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwQixRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDN0IsT0FBTyxDQUFDO0lBQ1IsTUFBTSxPQUFPLElBQUksQ0FBQztJQUNsQixLQUFLO0lBQ0wsSUFBSSxJQUFJLEVBQUUsSUFBSSxTQUFTLElBQUksRUFBRSxJQUFJLFNBQVMsRUFBRTtJQUM1QyxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUc7SUFDZixRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwQixRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZCLE9BQU8sQ0FBQztJQUNSLE1BQU0sT0FBTyxJQUFJLENBQUM7SUFDbEIsS0FBSztJQUNMLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRztJQUNiLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbEIsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsQixNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xCLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDckIsS0FBSyxDQUFDO0lBQ04sSUFBSSxPQUFPLElBQUksQ0FBQztJQUNoQixHQUFHO0FBQ0g7SUFDQTtJQUNBLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQ3hCLElBQUksSUFBSSxPQUFPLEVBQUUsSUFBSSxRQUFRLEVBQUU7SUFDL0IsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2YsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwQixRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3QixPQUFPLENBQUMsQ0FBQztJQUNULE1BQU0sT0FBTyxJQUFJLENBQUM7SUFDbEIsS0FBSztJQUNMLElBQUksSUFBSSxFQUFFLElBQUksU0FBUyxJQUFJLEVBQUUsSUFBSSxTQUFTLEVBQUU7SUFDNUMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2YsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwQixRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QixPQUFPLENBQUMsQ0FBQztJQUNULE1BQU0sT0FBTyxJQUFJLENBQUM7SUFDbEIsS0FBSztJQUNMLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNiLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbEIsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsQixNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xCLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDckIsS0FBSyxDQUFDLENBQUM7SUFDUCxJQUFJLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLEdBQUc7QUFDSDtJQUNBO0lBQ0EsRUFBRSxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7SUFDekQsSUFBSTtJQUNKLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO0lBQ3JCLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO0lBQ3JCLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO0lBQ3JCLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO0lBQ3JCLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO0lBQ3JCLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHO0lBQ3JCLE1BQU07SUFDTixHQUFHO0FBQ0g7SUFDQTtJQUNBLEVBQUUsTUFBTSxHQUFHO0lBQ1gsSUFBSSxJQUFJLEdBQUc7SUFDWCxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLFFBQVEsSUFBSSxDQUFDLFNBQVM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsU0FBUztJQUNULE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsUUFBUSxJQUFJLENBQUMsU0FBUztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixTQUFTO0lBQ1QsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixRQUFRLElBQUksQ0FBQyxTQUFTO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFNBQVM7SUFDVCxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLFFBQVEsSUFBSSxDQUFDLFNBQVM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QixVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsU0FBUyxDQUFDO0FBQ1Y7SUFDQSxJQUFJLE9BQU8sR0FBRyxDQUFDO0lBQ2YsR0FBRztBQUNIO0lBQ0EsRUFBRSxPQUFPLEdBQUc7SUFDWixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDN0IsSUFBSSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDNUI7SUFDQSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRTtJQUNsQixNQUFNLElBQUksQ0FBQyxHQUFHO0lBQ2QsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwQixRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwQixPQUFPLENBQUM7QUFDUjtJQUNBLE1BQU0sT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckIsS0FBSztBQUNMO0lBQ0E7SUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLElBQUksQ0FBQyxTQUFTO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVM7SUFDckIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sSUFBSSxDQUFDLFNBQVM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUztJQUNyQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLEdBQUcsR0FBRyxDQUFDO0FBQ2Q7SUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVM7SUFDckIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sSUFBSSxDQUFDLFNBQVM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUztJQUNyQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLEdBQUcsR0FBRyxDQUFDO0lBQ2QsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxJQUFJLENBQUMsU0FBUztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLEdBQUcsR0FBRyxDQUFDO0FBQ2Q7SUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLElBQUksQ0FBQyxTQUFTO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVM7SUFDckIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sSUFBSSxDQUFDLFNBQVM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNkLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUztJQUNyQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixPQUFPLEdBQUcsR0FBRyxDQUFDO0FBQ2Q7SUFDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVM7SUFDckIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxHQUFHLEdBQUcsQ0FBQztBQUNkO0lBQ0EsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1gsTUFBTSxJQUFJLENBQUMsU0FBUztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lB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QUM7SUFDM0IsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2IsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNYLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNaLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxRQUFRO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0M7SUFDQSxJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQzVCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2pFLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDakQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbkQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbkQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNuRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ2pELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ25ELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbkQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbkQs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QUUsQ0FBQyxDQUFDO0lBQ3ZDLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBR0EsTUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBR0EsTUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO0lBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVCLEtBQUssQ0FBQztJQUNOLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0lBQ2YsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsS0FBSyxDQUFDO0lBQ04sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUc7SUFDbEIsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsS0FBSyxDQUFDO0lBQ04sSUFBSSxJ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LENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLEdBQUc7SUFDSCxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztBQUNEO0lBQ08sU0FBUyxXQUFXLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRTtJQUNyRCxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7SUFDakQsSUFBSSxJQUFJLEVBQUUsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FB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QUFNLEVBQUUsQ0FBQyxTQUFTO0lBQ2xCLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUMxQixNQUFNLFVBQVU7SUFDaEIsTUFBTSxJQUFJLENBQUMsS0FBSztJQUNoQixNQUFNLElBQUksQ0FBQyxFQUFFO0lBQ2IsS0FBSyxDQUFDO0lBQ04sR0FBRztBQUNIO0lBQ0EsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtJQUNsQixJQUFJLE1BQU0sU0FBUyxHQUFHO0lBQ3RCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQUs7SUFDTCxJQUFJLE1BQU0sT0FBTyxHQUFHO0lBQ3BCLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQ3pFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQ2hFLE1BQUs7QUFDTDtJQUNBLElBQUksSUFBSSxjQUFjLEdBQUcsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JFLElBQUksV0FBVyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN6QztJQUNBLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNoQztJQUNBLElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUztJQUNoQyxNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUM7SUFDN0IsTUFBTSxPQUFPO0lBQ2IsTUFBTSxJQUFJLENBQUMsS0FBSztJQUNoQixNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNmLEdBQUc7SUFDSCxDQUFDO0FBQ0Q7SUFDTyxTQUFTLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRTtJQUM5QixFQUFFLE9BQU8sSUFBSSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUM1Qjs7SUNuUkE7SUFDQTtBQVFBO0lBQ08sSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ3RCLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNmLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNYLElBQUksT0FBTyxHQUFHO0lBQ3JCLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFQSxNQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEQsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRDtJQUNBLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQyxFQUFFLENBQUNBLE1BQUksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUMsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFQSxNQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlDLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRUEsTUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQyxFQUFFLENBQUNBLE1BQUksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUVBLE1BQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDakQsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDN0MsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUMsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUMsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFQSxNQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlDLEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRUEsTUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5QyxFQUFFLENBQUNBLE1BQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDL0MsRUFBRSxDQUFDQSxNQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFQSxNQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2pELEVBQUUsQ0FBQ0EsTUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFB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Q0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0MsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUVDLGFBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzSCxLQUFLO0lBQ0wsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUVBLGFBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQ1AsTUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUVBLE1BQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN0STtJQUNBLElBQUksSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLElBQUksRUFBRTtJQUN0QyxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUMzRCxRQUFRLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUVPLGFBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENB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QUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFO0lBQzlILElBQUksT0FBTyxJQUFJLENBQUM7SUFDaEIsR0FBRztBQUNIO0lBQ0EsRUFBRSxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7QUFDRDtJQUNPLFNBQVMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQzdELEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixFQUFFLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztBQUNmO0lBQ0EsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQyxFQUFFLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEM7SUFDQSxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7SUFDOUIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENB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QU0sSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLElBQUksRUFBRTtJQUN4QyxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUM3RCxVQUFVLElBQUlRLDZCQUFpQyxDQUFDUixNQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUVBLE1BQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO0lBQ3JMLFlBQVksTUFBTVEsNkJBQWlDLENBQUNSLE1BQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRUEsTUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7SUFDekwsY0FBYyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ3pILGdCQUFnQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEMsZUFBZSxNQUFNO0lBQ3JCLGdCQUFnQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2RCxlQUFlO0lBQ2YsYUFBYTtJQUNiLFdBQVc7SUFDWCxTQUFTO0lBQ1QsT0FBTztBQUNQO0lBQ0E7SUFDQSxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQzdDLFFBQVEsSUFBSVMsMEJBQThCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRVQsTUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7SUFDdkgsVUFBVSxNQUFNUywwQkFBOEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFVCxNQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtJQUMzSCxZQUFZLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7SUFDdkgsY0FBYyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEMsYUFBYSxNQUFNO0lBQ25CLGNBQWMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDckQsYUFBYTtJQUNiLFdBQVc7SUFDWCxTQUFTO0lBQ1QsT0FBTztBQUNQO0lBQ0EsTUFBTSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDN0IsTUFBc0I7SUFDdEIsUUFBUSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNyQyxRQUFRLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLFFBQVEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDckM7SUFDQTtJQUNBLFFBQVEsSUFBSSxNQUFNLEdBQUdBLE1BQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsRCxRQUFRLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRSxRQUFRLE1BQU0sQ0FBQyxJ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RCxNQUFNLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRSxHQUFHLENBQUMsQ0FBQztBQUNMO0lBQ0EsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxLQUFLO0lBQ3BELElBQUksTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO0lBQ3JDLElBQUksTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxDQUFDO0lBQ0wsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLE1BQU07SUFDL0MsSUFBSSxNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztJQUM1QixHQUFHLENBQUMsQ0FBQztJQUNMLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxNQUFNO0lBQzdDLElBQUksTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDN0IsR0FBRyxDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0Q7SUFDQSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxLQUFLO0lBQzNDLEVBQUUsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDdkIsRUFBRSxNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztBQUM3QjtJQUNBLEVBQUUsVUFBVSxFQUFFLENBQUM7SUFDZixFQUFFLElBQUksRUFBRSxDQUFDO0lBQ1QsQ0FBQyxDQUFDOzs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjUsMjYsMjddfQ==
