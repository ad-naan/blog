const express = require('express');
const router = express.Router();
const proxyController = require('@/controllers/proxy.controller');
const authMiddleware = require('@/middlewares/auth.middleware');
const { generalLimiter } = require('@/middlewares/rate-limit.middleware');

/**
 * @swagger
 * tags:
 *   name: 代理
 *   description: 🔄 CORS代理服务、跨域请求（天气、IP定位、音乐）
 */

/**
 * @swagger
 * /api/proxy/weather:
 *   get:
 *     summary: 天气 API 代理
 *     description: 通过后端代理获取山河天气 API 数据
 *     tags: [代理]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: 城市名称
 *         example: 成都
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [json, text]
 *           default: json
 *         description: 返回格式
 *     responses:
 *       200:
 *         description: 成功获取天气数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: 代理请求失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/weather', generalLimiter, proxyController.getWeather);
router.get('/weather/:city', generalLimiter, proxyController.getWeather);

/**
 * @swagger
 * /api/proxy/ip-location:
 *   get:
 *     summary: IP 地理位置代理
 *     description: 获取 IP 地理位置信息
 *     tags: [代理]
 *     parameters:
 *       - in: query
 *         name: ip
 *         schema:
 *           type: string
 *         description: IP地址（可选，不传则使用请求者IP）
 *         example: 8.8.8.8
 *     responses:
 *       200:
 *         description: 成功获取位置信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/ip-location', generalLimiter, proxyController.getIPLocation);
router.get('/ip-location/:ip', generalLimiter, proxyController.getIPLocation);

/**
 * @swagger
 * /api/proxy/music:
 *   get:
 *     summary: 音乐 URL 代理
 *     description: 获取音乐播放 URL
 *     tags: [代理]
 *     parameters:
 *       - in: query
 *         name: server
 *         schema:
 *           type: string
 *           enum: [tencent, netease, kugou]
 *           default: tencent
 *         description: 音乐平台
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 歌曲 ID
 *         example: "001OyHbk2MSIi4"
 *     responses:
 *       200:
 *         description: 成功获取音乐 URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/music', generalLimiter, proxyController.getMusicUrl);

/**
 * @swagger
 * /api/proxy/cache/clear:
 *   post:
 *     summary: 清除代理缓存
 *     description: 清除指定类型或全部代理缓存
 *     tags: [代理]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [ip, weather, music, all]
 *                 default: all
 *                 description: 缓存类型
 *     responses:
 *       200:
 *         description: 清除缓存成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/cache/clear', authMiddleware.verifyToken, authMiddleware.isAdmin, proxyController.clearCache);

module.exports = router;
