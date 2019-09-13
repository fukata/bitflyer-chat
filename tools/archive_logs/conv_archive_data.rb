######################################################################
# conv_json_data.rbで変換したjsonを元に
# gzip化、時間単位に分割する。 
######################################################################

Bundler.require
require 'time'
require 'json'
require 'optparse'
require 'zlib'

def parse_option()
  opt = {
    date: nil,
    all_json: false,
    verbose: false,
    json_dir: 'data/out/json',
    archive_dir: 'data/out/archives',
  }

  OptionParser.new do |parser|
    parser.on('--date DATE', 'YYYY-MM-DD') {|v| opt[:date] = Date.strptime(v, "%Y-%m-%d")}
    parser.on('--all-json', 'Convert all json files in json_dir') { opt[:all_json] = true }
    parser.on('--verbose', 'verbose') { opt[:verbose] = true }
    parser.parse!(ARGV)
  end

  opt
end

def save_archive_metadata(out_dir)
  metadata = {
    created_at: Time.now.utc.iso8601(),
    files: (24/6).times.map{|n| "messages.#{n}.json.gz"} 
  }
  File.open("#{out_dir}/metadata.json", 'w') do |f|
    f.puts(JSON.dump(metadata))
  end
end

def save_archive_messages(out_dir, idx, messages)
  File.open("#{out_dir}/messages.#{idx}.json.gz", 'w') do |f|
    gz = Zlib::GzipWriter.new(f)
    gz.write(JSON.dump(messages))
    gz.close
  end
end

def main
  opt = parse_option()
  
  messages_json_files = []

  if opt[:all_json]
    messages_json_files = Dir["#{opt[:json_dir]}/messages-*.json"].uniq().sort()
  else
    unless opt[:date]
      raise "date is must be not blank."
    end
    date_str = opt[:date].strftime("%Y-%m-%d")
    messages_json_files = ["#{opt[:json_dir]}/messages-#{date_str}.json"]
  end

  messages_json_files.each do |message_json_file|
    date = Date.strptime(message_json_file, "#{opt[:json_dir]}/messages-%Y-%m-%d.json")
    date_str = date.strftime("%Y-%m-%d")
    out_dir = "#{opt[:archive_dir]}/#{date.strftime("%Y/%m/%d")}"

    if File.exists?(out_dir)
      next 
    end

    puts message_json_file

    # データ用ディレクトリを作成
    FileUtils.mkdir_p(out_dir)
  
    messages = JSON.parse(IO.read("#{opt[:json_dir]}/messages-#{date_str}.json"), symbolize_names: true)

    # 分割するファイルのインデックスの割り振り。6時間おきに1ファイル作る。
    archive_messages = []
    current_idx = 0
    messages.each do |message|
      date = Time.strptime(message[:date], "%Y-%m-%dT%H:%M:%S.%L")
      file_idx = date.hour / 6 # 6時間おきに1ファイル作る。
      unless current_idx == file_idx
        save_archive_messages(out_dir, current_idx, archive_messages)
        current_idx = file_idx
        archive_messages = [] 
      end
      
      archive_messages.push(message)
    end

    save_archive_messages(out_dir, current_idx, archive_messages)
    save_archive_metadata(out_dir)
  end
end

main()