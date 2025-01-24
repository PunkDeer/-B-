// ==UserScript==
// @name         复制B站视频信息
// @namespace    https://bilibili.com/
// @version      2.0
// @description  在Bilibili视频页面添加按钮，用于复制UP主昵称、播放量、点赞、投币、收藏、分享、评论数和视频URL
// @author       Punk Deer
// @match        https://www.bilibili.com/video/*
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @updateURL    https://github.com/PunkDeer/-B-/raw/refs/heads/main/%E5%A4%8D%E5%88%B6B%E7%AB%99%E8%A7%86%E9%A2%91%E4%BF%A1%E6%81%AF.user.js
// @downloadURL  https://github.com/PunkDeer/-B-/raw/refs/heads/main/%E5%A4%8D%E5%88%B6B%E7%AB%99%E8%A7%86%E9%A2%91%E4%BF%A1%E6%81%AF.user.js

// ==/UserScript==

(function () {
    'use strict';

    // 处理万/亿等单位，转换成对应的数字
    function convertToNumber(value) {
        const regex = /(\d+(?:\.\d+)?)([万亿])/;
        const match = value.match(regex);

        if (match) {
            const num = parseFloat(match[1]);
            const unit = match[2];

            if (unit === '万') {
                return num * 10000;
            } else if (unit === '亿') {
                return num * 100000000;
            }
        }

        return value; // 如果没有匹配到单位，返回原值
    }

    // 获取指定信息的文本内容
    function getTextContent(selector) {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : null;
    }

    // 信息提取函数
    function getUpName() {
        return getTextContent('meta[name="author"]') || getTextContent('.up-name');
    }

    function getPlayCount() {
        const playCount = getTextContent('.view-text');
        return playCount ? convertToNumber(playCount) : null;
    }

    function getFollowCount() {
        const followCount = getTextContent('.follow-btn-inner');
        const match = followCount ? followCount.match(/关注\s*([\d.万亿]+)/) : null;
        return match ? convertToNumber(match[1]) : null;
    }

    // 获取点赞数
    function getLikeCount() {
        const likeCount = getTextContent('.video-like-info');
        return likeCount ? convertToNumber(likeCount) : null;
    }

    // 获取投币数
    function getCoinCount() {
        const coinCount = getTextContent('.video-coin-info');
        return coinCount ? convertToNumber(coinCount) : null;
    }

    // 获取收藏数（更新选择器）
    function getFavoriteCount() {
        const favoriteCount = getTextContent('.video-fav-info');
        return favoriteCount ? convertToNumber(favoriteCount) : null;
    }

    // 获取分享数
    function getShareCount() {
        const shareCount = getTextContent('.video-share-info');
        return shareCount ? convertToNumber(shareCount) : null;
    }

    // 获取评论数的函数
    function getCommentCount(bvid) {
        const apiUrl = `https://api.bilibili.com/x/v2/reply/count?type=1&oid=${bvid}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: apiUrl,
            onload: function(response) {
                const data = JSON.parse(response.responseText);
                if (data.code === 0) {
                    const commentCount = data.data.count;
                    console.log('评论总数:', commentCount);
                    GM_setClipboard(commentCount);  // 直接复制评论数
                    showToast(`已复制评论数：${commentCount}`);
                } else {
                    console.error('获取评论数失败');
                }
            },
            onerror: function(error) {
                console.error('请求失败:', error);
            }
        });
    }

    // 获取 bvid（视频的唯一标识符）
    function getBvid() {
        return window.location.pathname.split('/')[2];  // 从 URL 中提取 bvid
    }

    // 获取发布日期并格式化
    function getPublishDate() {
        const dateText = getTextContent('.pubdate-ip-text');
        if (dateText) {
            const date = new Date(dateText.split(' ')[0]); // 只取日期部分
            const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
            return formattedDate;
        }
        return null;
    }

    // 显示提示框
    function showToast(message) {
        const toast = document.createElement('div');
        toast.innerText = message;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',  // 将提示框放到左边
            backgroundColor: '#323232',
            color: '#fff',
            padding: '10px 15px',
            borderRadius: '5px',
            fontSize: '14px',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: '9999',
            opacity: '1',
            transition: 'opacity 0.5s ease',
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    }

    // 添加复制按钮
    function addCopyButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'copy-buttons-container';
        Object.assign(buttonContainer.style, {
            position: 'fixed',
            top: '80px',
            left: '10px',  // 将按钮容器放到左边
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        });

        const infoList = [
            { label: '昵称', getter: getUpName },
            { label: '关注', getter: getFollowCount },
            { label: '播放', getter: getPlayCount },
            { label: '点赞', getter: getLikeCount },
            { label: '投币', getter: getCoinCount },
            { label: '收藏', getter: getFavoriteCount },
            { label: '分享', getter: getShareCount },
        ];

        infoList.forEach(({ label, getter }) => {
            const button = document.createElement('button');
            button.innerText = `${label}`;
            Object.assign(button.style, {
                padding: '5px 15px',
                backgroundColor: '#00a1d6',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                fontSize: '14px',
                cursor: 'pointer',
            });
            button.addEventListener('click', () => {
                const value = getter();
                if (value) {
                    GM_setClipboard(value);
                    showToast(`已复制${label}：${value}`);
                } else {
                    showToast(`未能获取${label}，请稍后重试！`);
                }
            });
            buttonContainer.appendChild(button);
        });

        // 评论数按钮
        const commentButton = document.createElement('button');
        commentButton.innerText = '评论';
        Object.assign(commentButton.style, {
            padding: '5px 15px',
            backgroundColor: '#00a1d6',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: 'pointer',
        });
        commentButton.addEventListener('click', () => {
            const bvid = getBvid();
            getCommentCount(bvid);
        });

        buttonContainer.appendChild(commentButton);

        // 复制视频发布日期按钮
        const dateButton = document.createElement('button');
        dateButton.innerText = '日期';
        Object.assign(dateButton.style, {
            padding: '5px 15px',
            backgroundColor: '#00a1d6',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: 'pointer',
        });
        dateButton.addEventListener('click', () => {
            const publishDate = getPublishDate();
            if (publishDate) {
                GM_setClipboard(publishDate);
                showToast(`已复制发布日期：${publishDate}`);
            } else {
                showToast(`未能获取发布日期，可能页面加载较慢`);
            }
        });

        buttonContainer.appendChild(dateButton);

        // 复制视频URL按钮
        const urlButton = document.createElement('button');
        urlButton.innerText = 'URL';
        Object.assign(urlButton.style, {
            padding: '5px 15px',
            backgroundColor: '#00a1d6',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: 'pointer',
        });
        urlButton.addEventListener('click', () => {
            const videoUrl = window.location.href;
            GM_setClipboard(videoUrl);
            showToast(`已复制视频URL：${videoUrl}`);
        });

        buttonContainer.appendChild(urlButton);

        document.body.appendChild(buttonContainer);
    }

    // 初始化脚本
    function init() {
        if (document.querySelector('#copy-buttons-container')) return;
        addCopyButtons();
    }

    // 等待页面加载完成后执行
    window.addEventListener('load', init);
})();
