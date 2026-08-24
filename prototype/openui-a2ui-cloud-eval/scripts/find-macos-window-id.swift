import CoreGraphics
import Foundation

guard CommandLine.arguments.count == 2, let pid = Int32(CommandLine.arguments[1]) else {
    exit(2)
}
let options: CGWindowListOption = [.optionAll, .excludeDesktopElements]
guard let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
    exit(1)
}
for window in windows {
    guard
        let ownerPid = (window[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value,
        ownerPid == pid,
        let layer = (window[kCGWindowLayer as String] as? NSNumber)?.intValue,
        layer == 0,
        let number = (window[kCGWindowNumber as String] as? NSNumber)?.intValue
    else {
        continue
    }
    print(number)
    exit(0)
}
exit(1)
