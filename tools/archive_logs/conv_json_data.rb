######################################################################
# scraping.rbで保存したHTMLを解析し、
# bitflyer-chatに取り込める形式のファイルを生成する。 
######################################################################

Bundler.require
require 'time'
require 'json'
require 'digest/sha2'
require 'active_support/all'

# https://qiita.com/sonots/items/2a318e1c9a52c0046751#%E3%81%BE%E3%81%A8%E3%82%81%E3%82%8B%E3%81%A8%E3%81%93%E3%81%86
# [+-]HH:MM, [+-]HHMM, [+-]HH
NUMERIC_PATTERN = %r{\A[+-]\d\d(:?\d\d)?\z}

# Region/Zone, Region/Zone/Zone
NAME_PATTERN = %r{\A[^/]+/[^/]+(/[^/]+)?\z}

def strptime_with_zone(date, format, timezone)
  time = Time.strptime(date, format)
  _utc_offset = time.utc_offset
  _zone_offset = zone_offset(timezone)
  time.localtime(_zone_offset) + _utc_offset - _zone_offset
end

def zone_offset(timezone)
  if NUMERIC_PATTERN === timezone
    Time.zone_offset(timezone)
  elsif NAME_PATTERN === timezone
    tz = TZInfo::Timezone.get(timezone)
    tz.current_period.utc_total_offset
  elsif "UTC" == timezone # special treatment
    0
  else
    raise ArgumentError, "timezone format is invalid: #{timezone}"
  end
end

def resolve_message_doc_id(message)
  return Digest::SHA256.hexdigest("#{message[:date]}:#{message[:nickname]}:#{message[:message]}")
end

def main
  # データ用ディレクトリを作成
  FileUtils.mkdir_p('data/out/json')

  paths = Dir['data/raw/*.html'].select{|path| path.match(%Q|[0-9]{8}chat\.html|)}.uniq().sort()
  puts "#{paths.length} files" 
  paths.each do |path|
    matches = path.match(/([0-9]{4})([0-9]{2})([0-9]{2})chat\.html/)
    year = matches[1]
    month = matches[2]
    day = matches[3]
    out_path = "data/out/json/messages-#{year}-#{month}-#{day}.json"
    if File.exists?(out_path)
      next
    end

    messages = []
    # #centerbox .chatlog内の全ログを抽出する正規表現
    re_chatlog = %r|(<span class="chatlogtime">\[[0-9]{2}/[0-9]{2} [0-9]{2}:[0-9]{2}\]</span>\s?<span class="chatlogname">.+</span>\s?.+<br>)|m
    # 各行からデータを抽出する正規表現 
    re_message = %r|<span class="chatlogtime">\[([0-9]{2}/[0-9]{2} [0-9]{2}:[0-9]{2})\]</span>\s?<span class="chatlogname">(.+)</span>\s?(.+)|m
    html = IO.read(path)
    message_htmls = []
    if m = html.match(re_chatlog)
      message_htmls = m[0].split('<br>')
    else
      puts "Can't extract re_chatlog. path=#{path}"
      next
    end
    puts "path=#{path}, message_htmls.length=#{message_htmls.length}"

    # 秒以下のデータがないため、IDを生成した際に衝突する可能性があるので前回と同じ時間の場合は+1ミリ秒する。
    latest_message_date = nil
    latest_message_counter = 0 
    message_htmls.each do |message_html|
      matches = message_html.match(re_message)
      unless matches
        #puts "Can't extract message data"
        #puts message_html.inspect
        next
      end
      
      chatlogtime = matches[1].to_s.strip
      chatlogname = matches[2].to_s.strip
      message = matches[3].to_s.strip

      if chatlogtime == '' || chatlogname == ''
        puts "chatlogtime=#{chatlogtime}, chatlogname=#{chatlogname}"
        puts message_html.inspect
        next
      end

      time = strptime_with_zone("#{year}/#{chatlogtime}", "%Y/%m/%d %H:%M", "Asia/Tokyo")
      iso8601_time = time.utc.iso8601(3)
      if latest_message_date == iso8601_time
        latest_message_counter += 1
        time = time.since(0.001 * latest_message_counter)
        iso8601_time = time.utc.iso8601(3)
      else 
        latest_message_date = iso8601_time
        latest_message_counter = 0
      end 
      message = {
        nickname: chatlogname, 
        date: iso8601_time, 
        message: message
      }
      message[:id] = resolve_message_doc_id(message)
      messages.push(message)
    end

    #puts messages.inspect
    File.open(out_path, 'w') do |f|
      f.puts(JSON.dump(messages))
    end
  end
end

main()