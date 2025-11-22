(function () {
    function appendScript(url) {
        var script = document.createElement('script');
        script.src = url;
        script.defer = false;
        document.head.appendChild(script);
        return script;
    }

    function appendStyle(url) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
        return link;
    }

    function loadScript(localUrl, fallbackUrl) {
        var script = appendScript(localUrl);
        if (fallbackUrl) {
            script.onerror = function () {
                console.warn('本地脚本加载失败，尝试使用CDN：', localUrl);
                appendScript(fallbackUrl);
            };
        }
    }

    function loadStyle(localUrl, fallbackUrl) {
        var link = appendStyle(localUrl);
        if (fallbackUrl) {
            link.onerror = function () {
                console.warn('本地样式加载失败，尝试使用CDN：', localUrl);
                appendStyle(fallbackUrl);
            };
        }
    }

    window.LocalLibLoader = {
        loadScript: loadScript,
        loadStyle: loadStyle
    };
})();

