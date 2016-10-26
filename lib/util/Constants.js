//一些常量
/**
 *
 * @ 定义负载均衡策略常量，1为抢占式，适用于高并发的短连接；0为RR，适用于长连接
 */
exports.Constants = {
    //cluster模式下，各集群node间的负载均衡策略
    lb_policy_preemptive : 1,
    lb_policy_roundrobin : 0,

    //rpc调用模式
    invoke_mode_reqResp_stateful : 2,
    invoke_mode_reqResp_stateless : 1,
    invoke_mode_req : 0,

    //消息类型
    message_type_req : 1,
    message_type_resp : 0,

    //zero运行模式
    runtime_runMode_multi_core:1,
    runtime_runMode_single_core:0,

    //Access Service: 在对接外部系统时，平台相对于外部系统的连接方式
    acs_mode_server:0,
    acs_mode_client:1,
    acs_mode_clientServer:2,

    //Access Service: 在对接外部系统时，指定同步或异步
    acs_type_sync: 0,
    acs_type_async: 1
};

/**
 *
 * @ 内部消息名称，设定为数字，提高比较效率
 */
exports.MESSAGE  = {
    LISTEN    : 2,
    REQ_FD    : 11
};
