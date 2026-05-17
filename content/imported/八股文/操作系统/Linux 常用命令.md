---
tags: [八股文, 操作系统, 面试]
source: "[[Java八股PDF]]"
date: 2026-04-30
---

# Linux 常用命令

## 问题
Linux 常用命令有哪些？如何查看日志？如何排查 CPU 过高问题？如何查看网络连接？

## 答案

### 文件操作

**cd - 切换目录**
```bash
cd /home/user        # 切换到指定目录
cd ..                # 返回上一级目录
cd ~                 # 切换到当前用户 home 目录
cd -                 # 切换到上次所在的目录
cd /                 # 切换到根目录
```

**pwd - 显示当前工作目录**
```bash
pwd                  # 输出：/home/user/project
```

**ls - 列出目录内容**
```bash
ls                   # 列出当前目录下的文件和文件夹
ls -l                # 详细信息（权限、大小、修改时间等）
ls -la               # 包含隐藏文件（以 . 开头的文件）
ls -lh               # 文件大小以人类可读方式显示（KB、MB）
ls -lt               # 按修改时间排序
ls -lS               # 按文件大小排序
ls -lR               # 递归列出子目录内容
```

**mkdir - 创建目录**
```bash
mkdir dir1           # 创建目录
mkdir -p dir1/dir2   # 递归创建多级目录
mkdir -m 755 dir1    # 创建目录并设置权限
```

**rm - 删除文件/目录**
```bash
rm file.txt          # 删除文件
rm -r dir1           # 递归删除目录及其内容
rm -f file.txt       # 强制删除，不提示确认
rm -rf dir1          # 强制递归删除（危险！慎用）
rm -i file.txt       # 删除前提示确认
```

**cp - 复制文件/目录**
```bash
cp file1 file2       # 复制文件
cp -r dir1 dir2      # 递归复制目录
cp -p file1 file2    # 保留文件属性（权限、时间等）
cp -a dir1 dir2      # 等同于 -dpR，保留所有属性
```

**mv - 移动/重命名文件**
```bash
mv file1 file2       # 重命名文件
mv file1 /tmp/       # 移动文件到 /tmp 目录
mv dir1 dir2         # 移动/重命名目录
```

**find - 查找文件**
```bash
find / -name "*.log"                # 按文件名查找
find / -name "*.log" -type f        # 只查找文件（不包括目录）
find / -name "*.log" -mtime -7      # 查找 7 天内修改过的文件
find / -size +100M                  # 查找大于 100MB 的文件
find / -user root                   # 查找属于 root 用户的文件
find . -name "*.java" -exec grep "TODO" {} \;  # 查找包含 TODO 的 Java 文件
find . -name "*.class" -delete      # 删除所有 .class 文件
```

**vim - 文本编辑器**
```bash
vim file.txt         # 打开文件
```
```vim
# 常用操作
i                    # 进入插入模式
Esc                  # 退出插入模式
:w                   # 保存
:q                   # 退出
:wq                  # 保存并退出
:q!                  # 强制退出不保存
/dd                  # 搜索 dd
n                    # 查找下一个
:%s/old/new/g        # 全局替换
:set nu              # 显示行号
gg                   # 跳到文件开头
G                    # 跳到文件结尾
dd                   # 删除当前行
yy                   # 复制当前行
p                    # 粘贴
u                    # 撤销
Ctrl + r             # 重做
```

---

### 文件内容查看

**cat - 查看文件内容**
```bash
cat file.txt                 # 显示文件全部内容
cat -n file.txt              # 显示行号
cat file1 file2              # 连接多个文件内容
cat > file.txt << EOF        # 创建文件并写入内容
hello
world
EOF
```

**head - 查看文件开头**
```bash
head file.txt                # 显示前 10 行（默认）
head -n 20 file.txt          # 显示前 20 行
head -n -5 file.txt          # 显示除最后 5 行外的所有内容
```

**tail - 查看文件末尾**
```bash
tail file.txt                # 显示最后 10 行（默认）
tail -n 20 file.txt          # 显示最后 20 行
tail -f file.txt             # 实时追踪文件变化（日志监控利器）
tail -F file.txt             # 实时追踪，文件被轮转时自动重新打开
tail -n +5 file.txt          # 从第 5 行开始显示到末尾
```

**grep - 文本搜索**
```bash
grep "error" file.txt                # 搜索包含 error 的行
grep -i "error" file.txt             # 忽略大小写
grep -n "error" file.txt             # 显示行号
grep -r "error" /var/log/            # 递归搜索目录下的文件
grep -c "error" file.txt             # 统计匹配行数
grep -v "error" file.txt             # 显示不包含 error 的行（反向匹配）
grep -A 3 "error" file.txt           # 显示匹配行及后 3 行
grep -B 3 "error" file.txt           # 显示匹配行及前 3 行
grep -C 3 "error" file.txt           # 显示匹配行及前后 3 行
grep -E "error|warn" file.txt        # 正则表达式（匹配 error 或 warn）
grep --include="*.log" -r "error" .  # 只搜索 .log 文件
```

---

### 网络

**netstat - 网络连接状态**
```bash
netstat -nap                    # 显示所有连接和监听端口，带进程信息
netstat -tlnp                   # 显示 TCP 监听端口
netstat -ulnp                   # 显示 UDP 监听端口
netstat -anp | grep ESTABLISHED # 查看已建立的连接
netstat -anp | grep 8080        # 查看 8080 端口的连接
netstat -s                      # 显示网络统计信息
netstat -r                      # 显示路由表
```

**ss - 网络连接状态（推荐，比 netstat 更快）**
```bash
ss -tlnp                        # 显示 TCP 监听端口
ss -s                           # 显示连接统计
ss -tnp                         # 显示 TCP 连接
ss state established            # 显示已建立的连接
ss -tnp | grep 8080             # 查看 8080 端口的连接
```

**curl - HTTP 请求工具**
```bash
curl http://example.com                 # GET 请求
curl -X POST -d '{"key":"value"}' http://example.com/api  # POST 请求
curl -o file.zip http://example.com/file.zip  # 下载文件
curl -I http://example.com              # 只获取响应头
curl -v http://example.com              # 详细输出
curl -H "Content-Type: application/json" http://example.com  # 自定义请求头
```

**其他网络命令**
```bash
ping example.com               # 测试网络连通性
telnet localhost 8080           # 测试端口连通性
nslookup example.com           # DNS 查询
dig example.com                 # DNS 查询（更详细）
traceroute example.com         # 路由追踪
ip addr                         # 查看 IP 地址
ifconfig                        # 查看网络接口信息
```

---

### CPU

**top - 实时监控系统资源**
```bash
top                          # 实时显示系统资源使用情况
top -Hp <pid>                # 显示指定进程中各线程的 CPU 使用情况
```

**top 界面说明**：
```
top - 14:30:00 up 10 days,  3:20,  2 users,  load average: 1.50, 1.20, 1.00
Tasks: 200 total,   1 running, 199 sleeping,   0 stopped,   0 zombie
%Cpu(s): 25.0 us,  5.0 sy,  0.0 ni, 69.0 id,  0.5 wa,  0.0 hi,  0.5 si,  0.0 st
MiB Mem :  16384.0 total,   8192.0 free,   4096.0 used,   4096.0 buff/cache
MiB Swap:   8192.0 total,   8192.0 free,      0.0 used.  11264.0 avail Mem

# 解释：
# load average: 1分钟、5分钟、15分钟的平均负载
# us: 用户空间 CPU 占比
# sy: 内核空间 CPU 占比
# id: 空闲 CPU 占比
# wa: 等待 IO 的 CPU 占比
```

**top 快捷键**：
```
1            # 显示每个 CPU 核心的使用率
P            # 按 CPU 使用率排序
M            # 按内存使用率排序
k            # 杀死进程
q            # 退出
```

**mpstat - CPU 使用率详情**
```bash
mpstat -P ALL 1               # 每秒显示所有 CPU 核心的使用率
```

---

### 磁盘

**df - 磁盘空间使用情况**
```bash
df -h                         # 以人类可读方式显示（KB、MB、GB）
df -i                         # 显示 inode 使用情况
df -h /home                   # 显示指定目录所在分区的使用情况
```

**du - 目录/文件大小**
```bash
du -sh /var/log               # 显示目录总大小
du -sh *                      # 显示当前目录下各文件/目录的大小
du -sh /var/log/*             # 显示 /var/log 下各项大小
du -h --max-depth=1 /         # 显示根目录下一级子目录大小
sort -rh                      # 按大小排序（配合 du 使用）
```

**iostat - IO 统计**
```bash
iostat -x 1                   # 每秒显示 IO 统计详情
```

---

### 进程

**ps - 进程状态**
```bash
ps aux                        # 显示所有进程（详细信息）
ps -ef                        # 显示所有进程（标准格式）
ps aux | grep java            # 查找 Java 进程
ps -ef | grep nginx           # 查找 Nginx 进程
ps -eo pid,ppid,cmd,%cpu,%mem --sort=-%cpu | head  # 按 CPU 使用率排序的前几个进程
ps -eo pid,ppid,cmd,%mem --sort=-%mem | head       # 按内存使用率排序的前几个进程
```

**ps aux 输出说明**：
```
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.1 168640 11480 ?        Ss   Mar20   0:05 /sbin/init
```
- VSZ：虚拟内存大小
- RSS：物理内存大小（实际占用）
- STAT：进程状态（S=睡眠，R=运行，Z=僵尸，+=前台进程）

**kill - 终止进程**
```bash
kill <pid>                    # 发送 SIGTERM（优雅终止）
kill -9 <pid>                 # 发送 SIGKILL（强制终止）
kill -l                       # 列出所有信号
killall java                  # 按进程名杀死所有 Java 进程
pkill -f "java.*myapp"        # 按命令行模式杀死进程
```

**常用信号**：
```
SIGHUP (1)    # 终端挂起
SIGINT (2)    # 中断（Ctrl+C）
SIGTERM (15)  # 优雅终止（默认）
SIGKILL (9)   # 强制终止（无法捕获和忽略）
SIGSTOP (19)  # 暂停进程（Ctrl+Z）
SIGCONT (18)  # 继续执行暂停的进程
```

**其他进程相关命令**
```bash
pstree                        # 以树形显示进程关系
pgrep java                    # 查找 Java 进程的 PID
nohup java -jar app.jar &     # 后台运行，不受终端关闭影响
jobs                          # 查看后台任务
fg %1                         # 将后台任务切换到前台
bg %1                         # 继续执行后台任务
```

---

### 日志分析常用命令组合

**查看最近的错误日志**
```bash
tail -n 1000 app.log | grep -i "error"
```

**实时监控错误日志**
```bash
tail -f app.log | grep --line-buffered "ERROR"
```

**统计错误出现次数**
```bash
grep -c "ERROR" app.log
```

**按时间段筛选日志**
```bash
# 使用 sed 或 awk 筛选时间范围
sed -n '/2026-04-30 10:00/,/2026-04-30 11:00/p' app.log
```

**查找异常堆栈**
```bash
# 查找 Exception 及后续 20 行
grep -A 20 "Exception" app.log

# 查找 NullPointerException
grep -B 5 -A 20 "NullPointerException" app.log
```

**统计每小时错误数量**
```bash
grep "ERROR" app.log | awk '{print substr($1,1,13)}' | sort | uniq -c | sort -rn
```

**查找最耗时的请求**
```bash
grep "cost" app.log | awk -F'cost=' '{print $2}' | sort -rn | head -20
```

**查看 GC 日志**
```bash
grep "Full GC" gc.log
grep "OutOfMemoryError" app.log
```

**查看线程 Dump**
```bash
jstack <pid> > thread_dump.txt
# 或
kill -3 <pid>  # 输出到标准输出（通常重定向到日志文件）
```

**查看堆 Dump**
```bash
jmap -dump:format=b,file=heap_dump.hprof <pid>
jmap -heap <pid>  # 查看堆内存使用情况
```

---

### 其他常用命令

**系统信息**
```bash
uname -a                      # 查看系统信息
cat /etc/os-release           # 查看操作系统版本
uptime                        # 查看系统运行时间和负载
free -h                       # 查看内存使用情况
```

**权限管理**
```bash
chmod 755 file.txt            # 设置权限（rwxr-xr-x）
chmod +x script.sh            # 添加执行权限
chown user:group file.txt     # 修改文件所有者
```

**压缩和解压**
```bash
tar -czf archive.tar.gz dir/  # 压缩目录
tar -xzf archive.tar.gz      # 解压
tar -xzf archive.tar.gz -C /tmp/  # 解压到指定目录
unzip file.zip                # 解压 zip 文件
```

**定时任务**
```bash
crontab -e                    # 编辑定时任务
crontab -l                    # 查看定时任务
# 格式：分 时 日 月 周 命令
# 示例：每天凌晨 2 点执行备份
# 0 2 * * * /home/user/backup.sh
```

**管道和重定向**
```bash
command > file.txt             # 标准输出重定向到文件（覆盖）
command >> file.txt            # 标准输出追加到文件
command 2>&1                   # 标准错误重定向到标准输出
command | tee file.txt         # 同时输出到屏幕和文件
command1 | command2            # 管道，将 command1 的输出作为 command2 的输入
```

**xargs - 参数传递**
```bash
find . -name "*.log" | xargs rm    # 删除所有 .log 文件
find . -name "*.java" | xargs grep "TODO"  # 在所有 Java 文件中搜索 TODO
echo "a b c" | xargs -n 1         # 每次传递一个参数
```

**awk - 文本处理**
```bash
awk '{print $1}' file.txt           # 打印第一列
awk -F: '{print $1, $3}' /etc/passwd # 按冒号分隔，打印第1和第3列
awk '{sum+=$1} END {print sum}' file.txt  # 求和
awk 'NR>=10 && NR<=20' file.txt     # 打印第10到20行
```

**sed - 流编辑器**
```bash
sed 's/old/new/g' file.txt         # 替换文本
sed -i 's/old/new/g' file.txt     # 直接修改文件
sed -n '10,20p' file.txt           # 打印第10到20行
sed '/^#/d' file.txt               # 删除注释行
```

## 相关笔记
- [[中断与进程状态]]
- [[进程线程与协程]]

## 来源
来源：Java八股文PDF
