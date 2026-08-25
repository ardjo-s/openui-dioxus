import CoreGraphics
import Foundation

guard CommandLine.arguments.count == 2, let pid = Int32(CommandLine.arguments[1]) else {
    exit(2)
}
let options: CGWindowListOption = [.optionAll, .excludeDesktopElements]
guard let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
    exit(1)
}
let candidates = windows.compactMap { window -> (number: Int, area: Double)? in
    guard
        let ownerPid = (window[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value,
        ownerPid == pid,
        let layer = (window[kCGWindowLayer as String] as? NSNumber)?.intValue,
        layer == 0,
        let number = (window[kCGWindowNumber as String] as? NSNumber)?.intValue,
        let bounds = window[kCGWindowBounds as String] as? [String: Any],
        let width = bounds["Width"] as? Double,
        let height = bounds["Height"] as? Double,
        width >= 320,
        height >= 240,
        (window[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1 > 0
    else { return nil }
    return (number, width * height)
}
guard let winner = candidates.max(by: { $0.area < $1.area }) else { exit(1) }
print(winner.number)
