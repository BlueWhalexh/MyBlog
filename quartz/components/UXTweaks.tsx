// @ts-ignore
import uxScript from "./scripts/uxtweaks.inline"
import { QuartzComponent, QuartzComponentConstructor } from "./types"

const UXTweaks: QuartzComponent = () => <div id="ux-tweaks" data-ux="ready" style="display:none" />
UXTweaks.afterDOMLoaded = uxScript

export default (() => UXTweaks) satisfies QuartzComponentConstructor
