const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '..', '..', '.env') 
});

/**
 * 环境变量校验函数
 * 确保必要的数据库配置项已通过.env文件提供，避免敏感信息硬编码
 */
const validateEnvironmentVariables = () => {
  const requiredEnvVars = [
    'MYSQL_USER', 
    'MYSQL_PASSWORD', 
    'MYSQL_DATABASE'
  ];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`数据库初始化失败：缺失必要环境变量 ${missingVars.join(', ')}，请检查.env文件`);
  }
};

// 执行环境变量校验，若缺失必要配置则终止启动
validateEnvironmentVariables();

/**
 * MySQL数据库配置
 * 设置合理的连接池限制
 */
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER, // 强制从环境变量获取，无默认值
  password: process.env.MYSQL_PASSWORD, // 强制从环境变量获取，无默认值
  database: process.env.MYSQL_DATABASE, // 强制从环境变量获取，无默认值
  connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT, 10) || 10, // 最大连接数
  queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT, 10) || 50, // 等待队列上限（避免无限制堆积）
  acquireTimeout: 60000, // 获取连接的超时时间（ms）
  timeout: 60000, // 连接空闲超时时间（ms）
  connectTimeout: 10000, // 初始连接超时时间（ms）
  waitForConnections: true, // 连接池满时是否等待（而非直接报错）
  charset: 'utf8mb4', // 支持emoji等特殊字符
  timezone: '+08:00' // 时区配置（与业务时区保持一致）
};

// 创建MySQL连接池（连接池是数据库操作的核心入口）
const pool = mysql.createPool(dbConfig);

/**
 * 测试数据库连接
 * 连接失败时自动关闭连接池，避免资源泄漏
 * @returns {Promise<{success: boolean, error?: string}>} 连接结果
 */
async function testConnection() {
  try {
    console.log('🔌 开始测试MySQL数据库连接...');
    const connection = await pool.getConnection();
    console.log('✅ MySQL数据库连接成功');
    connection.release(); // 释放连接回池
    return { success: true };
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error.message);
    await closePool(); // 连接失败时主动关闭池
    return { success: false, error: error.message };
  }
}

/**
 * 执行SQL查询
 * 统一返回格式，便于上层处理成功/失败场景
 * @param {string} sql - SQL语句（支持参数占位符?）
 * @param {Array} params - SQL参数数组（与占位符一一对应）
 * @returns {Promise<{success: boolean, data?: Array, fields?: Array, error?: string}>} 查询结果
 */
async function query(sql, params = []) {
  try {
    // 确保参数格式正确，特别是数字参数
    const processedParams = params.map(param => {
      if (typeof param === 'string' && !isNaN(param) && param.trim() !== '') {
        // 将可以转换为数字的字符串转换为数字
        return parseInt(param, 10);
      }
      return param;
    });
    
    // 特殊处理SHOW TABLES语句 - MySQL2不支持SHOW TABLES的参数绑定
    if (sql.trim().toUpperCase().startsWith('SHOW TABLES')) {
      // 对于SHOW TABLES语句，直接执行而不使用参数绑定
      const [rows, fields] = await pool.execute(sql);
      return { success: true, data: rows, fields };
    }
    
    // 对于复杂的JOIN查询，使用更安全的参数处理方式
    const connection = await pool.getConnection();
    try {
      const [rows, fields] = await connection.execute(sql, processedParams);
      return { success: true, data: rows, fields };
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ SQL查询执行失败:', error.message);
    console.error('关联SQL:', sql);
    console.error('关联参数:', params);
    
    // 如果是参数绑定错误，提供更详细的调试信息
    if (error.message.includes('Incorrect arguments to mysqld_stmt_execute')) {
      console.error('🔍 参数绑定错误调试信息:');
      console.error('  - SQL语句中的占位符数量:', (sql.match(/\?/g) || []).length);
      console.error('  - 提供的参数数量:', params.length);
      console.error('  - 请检查参数类型和数量是否匹配');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * 事务处理
 * 自动管理事务的开启、提交、回滚，统一错误处理格式
 * @param {Function} callback - 事务回调函数（需返回Promise，接收connection参数）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} 事务结果
 */
async function transaction(callback) {
  let connection; // 声明在外部，确保finally能访问
  try {
    // 从连接池获取专属连接
    connection = await pool.getConnection();
    // 开启事务
    await connection.beginTransaction();
    // 执行用户传入的事务逻辑（需确保callback内部正确使用await）
    const result = await callback(connection);
    // 提交事务
    await connection.commit();
    return { success: true, data: result };
  } catch (error) {
    // 若连接已获取，执行回滚
    if (connection) {
      await connection.rollback().catch(rollbackErr => {
        console.error('❌ 事务回滚失败:', rollbackErr.message);
      });
    }
    console.error('❌ 事务执行失败:', error.message);
    return { success: false, error: error.message };
  } finally {
    // 无论成功失败，释放连接回池
    if (connection) {
      connection.release();
    }
  }
}

/**
 * 获取连接池状态
 * 用于监控连接池使用情况，便于排查连接泄漏等问题
 * @returns {Promise<{activeConnections: number, idleConnections: number, totalConnections: number, waitingQueueLength: number}>} 连接池状态
 */
async function getPoolStatus() {
  try {
    // 通过临时获取连接来访问连接池内部状态
    const connection = await pool.getConnection();
    const poolState = {
      activeConnections: connection.pool._activeConnections.length, // 正在使用的连接数
      idleConnections: connection.pool._idleConnections.length, // 空闲的连接数
      totalConnections: connection.pool._allConnections.length, // 总创建的连接数
      waitingQueueLength: connection.pool._pendingConnections.length // 等待队列长度
    };
    connection.release();
    return poolState;
  } catch (error) {
    console.error('❌ 获取连接池状态失败:', error.message);
    return null;
  }
}

/**
 * 关闭连接池
 * 应用退出时调用，释放所有数据库连接
 */
async function closePool() {
  try {
    await pool.end();
    console.log('✅ MySQL连接池已成功关闭');
  } catch (error) {
    console.error('❌ 关闭MySQL连接池失败:', error.message);
  }
}

// 导出数据库操作工具
module.exports = {
  pool,          // 原始连接池对象（谨慎使用）
  dbConfig,      // 数据库配置（便于调试）
  testConnection, // 测试连接方法
  query,         // 执行SQL查询
  transaction,   // 事务处理
  getPoolStatus, // 连接池状态监控
  closePool      // 关闭连接池
};