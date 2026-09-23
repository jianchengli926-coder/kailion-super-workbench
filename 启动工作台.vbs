' 锴利超级AI工作台 - Windows启动器（无黑框）
' 双击此文件即可在默认浏览器中打开工作台

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录
strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' 工作台HTML文件路径
strHtmlFile = strScriptDir & "\index.html"

' 检查文件是否存在
If objFSO.FileExists(strHtmlFile) Then
    ' 用默认浏览器打开
    objShell.Run """" & strHtmlFile & """", 1, False
Else
    MsgBox "未找到工作台文件：" & vbCrLf & strHtmlFile & vbCrLf & vbCrLf & "请确保启动器与 index.html 在同一文件夹中。", vbCritical, "锴利超级AI工作台"
End If

Set objShell = Nothing
Set objFSO = Nothing
