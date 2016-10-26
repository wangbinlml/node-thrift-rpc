namespace java com.wb.zero.thrift
const string VERSION = "19.24.0"

# data structures
/** A specific column was requested that does not exist. */
exception NotFoundException {
}

/** Invalid request could mean keyspace or column family does not exist, required parameters are missing, or a parameter is malformed. 
    why contains an associated error message.
*/
exception InvalidRequestException {
    1: required string why
}

/** Not all the replicas required could be created and/or read. */
exception UnavailableException {
}

/** RPC timeout was exceeded.  either a node failed mid-operation, or load was too high, or the requested op was too large. */
exception TimedOutException {
}

struct Header {
  1: required string protocol,
  2: required string tid,
  3: required i32 msgType,
  4: optional i32 invokeMode,
  5: optional string connectionId,
  6: optional string msgName,
  7: optional string rpcId,
  8: optional string relayState,
  9: optional string url,
  10: optional string comeFrom,
  11: optional string to,
  12: optional i32 resultCode,
  13: optional string apId,
}

struct Msg {
  1: required Header header
  2: required string body
}

service RPCInvokeService {
	void invoke(1:required string serviceName, 2:required string methodName, 3: required Msg msg) throws (1:InvalidRequestException invalidReq, 2:TimedOutException timeOut),
}
